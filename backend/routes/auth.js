const { Router, json } = require("express");
const { OAuth2Client } = require("google-auth-library");

const authRouter = Router();
const googleClient = new OAuth2Client();
const cookieName = "hsd.sid";

function sendError(response, status, code, message) {
  return response.status(status).json({ error: { code, message } });
}

function requireTrustedOrigin(request, response, next) {
  if (request.get("origin") !== process.env.CLIENT_ORIGIN) {
    return sendError(response, 403, "INVALID_ORIGIN", "The request origin is not allowed.");
  }

  next();
}

function requireJson(request, response, next) {
  if (!request.is("application/json")) {
    return sendError(response, 415, "JSON_REQUIRED", "Content-Type must be application/json.");
  }

  next();
}

function regenerateSession(request) {
  return new Promise((resolve, reject) => {
    request.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
}

function saveSession(request) {
  return new Promise((resolve, reject) => {
    request.session.save((error) => (error ? reject(error) : resolve()));
  });
}

function destroySession(request) {
  return new Promise((resolve, reject) => {
    request.session.destroy((error) => (error ? reject(error) : resolve()));
  });
}

async function loadOrganizations(database, user) {
  const result = user.role === "platform_admin"
    ? await database.query(`
        SELECT id, auth_org_name AS name
        FROM organizations
        ORDER BY auth_org_name, id
      `)
    : await database.query(`
        SELECT organization.id, organization.auth_org_name AS name
        FROM organization_members AS membership
        JOIN organizations AS organization ON organization.id = membership.organization_id
        WHERE membership.user_id = $1
        ORDER BY organization.auth_org_name, organization.id
      `, [user.id]);

  return result.rows;
}

function getDestination(user, activeOrganization) {
  if (user.role === "platform_admin") {
    return "/admin";
  }

  return activeOrganization ? "/dashboard" : "/select-organization";
}

function toPayload(user, organizations, activeOrganizationId) {
  const activeOrganization = organizations.find(
    (organization) => organization.id === activeOrganizationId,
  ) || null;

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    organizations,
    activeOrganization,
    destination: getDestination(user, activeOrganization),
  };
}

async function loadCurrentContext(request, response) {
  const userId = request.session.user_id;

  if (!userId) {
    sendError(response, 401, "SESSION_EXPIRED", "Please sign in again.");
    return null;
  }

  const database = request.app.locals.database;
  const userResult = await database.query(
    "SELECT id, email, name, role, status FROM users WHERE id = $1",
    [userId],
  );
  const user = userResult.rows[0];

  if (!user || user.status !== "active") {
    await destroySession(request);
    const disabled = user?.status === "disabled";
    sendError(
      response,
      disabled ? 403 : 401,
      disabled ? "USER_DISABLED" : "SESSION_EXPIRED",
      disabled ? "This account is disabled." : "Please sign in again.",
    );
    return null;
  }

  const organizations = await loadOrganizations(database, user);

  if (user.role === "client" && organizations.length === 0) {
    await destroySession(request);
    sendError(response, 403, "NO_ORGANIZATION", "No organization is assigned to this account.");
    return null;
  }

  const currentId = request.session.active_organization_id;
  const currentIsAllowed = organizations.some((organization) => organization.id === currentId);
  const nextId = currentIsAllowed
    ? currentId
    : user.role === "client" && organizations.length === 1
      ? organizations[0].id
      : undefined;

  if (currentId !== nextId) {
    if (nextId) {
      request.session.active_organization_id = nextId;
    } else {
      delete request.session.active_organization_id;
    }
    await saveSession(request);
  }

  return { user, organizations, activeOrganizationId: nextId };
}

authRouter.post("/google", requireTrustedOrigin, requireJson, json(), async (request, response) => {
  if (Object.hasOwn(request.query, "credential")) {
    return sendError(response, 400, "INVALID_REQUEST", "Send the credential in the JSON body.");
  }

  const credential = request.body?.credential;

  if (typeof credential !== "string" || credential.length === 0) {
    return sendError(response, 400, "INVALID_REQUEST", "A Google credential is required.");
  }

  let googlePayload;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_AUTH_CLIENT_ID,
    });
    googlePayload = ticket.getPayload();
  } catch {
    return sendError(response, 401, "INVALID_GOOGLE_CREDENTIAL", "Google sign-in could not be verified.");
  }

  if (!googlePayload?.email_verified) {
    return sendError(response, 403, "EMAIL_NOT_VERIFIED", "The Google email address is not verified.");
  }

  if (!googlePayload.sub || !googlePayload.email) {
    return sendError(response, 401, "INVALID_GOOGLE_CREDENTIAL", "Google sign-in is missing required account details.");
  }

  const database = request.app.locals.database;
  let user;
  let organizations;
  const returningResult = await database.query(
    "SELECT id, google_sub, email, name, role, status FROM users WHERE google_sub = $1",
    [googlePayload.sub],
  );

  if (returningResult.rows[0]) {
    user = returningResult.rows[0];

    if (user.status === "disabled") {
      return sendError(response, 403, "USER_DISABLED", "This account is disabled.");
    }

    if (user.status === "invited" || (!user.name && googlePayload.name)) {
      const updatedResult = await database.query(`
        UPDATE users
        SET status = 'active', name = COALESCE(name, $2)
        WHERE id = $1
        RETURNING id, google_sub, email, name, role, status
      `, [user.id, googlePayload.name || null]);
      user = updatedResult.rows[0];
    }

    organizations = await loadOrganizations(database, user);
  } else {
    const client = await database.connect();

    try {
      await client.query("BEGIN");
      const invitedResult = await client.query(`
        SELECT id, google_sub, email, name, role, status
        FROM users
        WHERE LOWER(email) = LOWER($1)
        FOR UPDATE
      `, [googlePayload.email]);
      user = invitedResult.rows[0];

      if (!user) {
        await client.query("ROLLBACK");
        return sendError(response, 403, "USER_NOT_INVITED", "This email address has not been invited.");
      }

      if (user.status === "disabled") {
        await client.query("ROLLBACK");
        return sendError(response, 403, "USER_DISABLED", "This account is disabled.");
      }

      if (user.google_sub && user.google_sub !== googlePayload.sub) {
        await client.query("ROLLBACK");
        return sendError(response, 409, "ACCOUNT_LINK_CONFLICT", "This invitation is linked to another Google account.");
      }

      const updatedResult = await client.query(`
        UPDATE users
        SET google_sub = $1, status = 'active', name = COALESCE(name, $2)
        WHERE id = $3
        RETURNING id, google_sub, email, name, role, status
      `, [googlePayload.sub, googlePayload.name || null, user.id]);
      user = updatedResult.rows[0];
      organizations = await loadOrganizations(client, user);

      if (user.role === "client" && organizations.length === 0) {
        await client.query("ROLLBACK");
        return sendError(response, 403, "NO_ORGANIZATION", "No organization is assigned to this account.");
      }

      await client.query("COMMIT");
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {}

      if (error.code === "23505") {
        return sendError(response, 409, "ACCOUNT_LINK_CONFLICT", "This Google account is already linked.");
      }

      throw error;
    } finally {
      client.release();
    }
  }

  if (user.role === "client" && organizations.length === 0) {
    return sendError(response, 403, "NO_ORGANIZATION", "No organization is assigned to this account.");
  }

  await regenerateSession(request);
  request.session.user_id = user.id;

  if (user.role === "client" && organizations.length === 1) {
    request.session.active_organization_id = organizations[0].id;
  }

  await saveSession(request);
  return response.json(toPayload(user, organizations, request.session.active_organization_id));
});

authRouter.get("/me", async (request, response) => {
  const context = await loadCurrentContext(request, response);

  if (!context) {
    return;
  }

  response.json(toPayload(context.user, context.organizations, context.activeOrganizationId));
});

authRouter.post("/organization", requireTrustedOrigin, requireJson, json(), async (request, response) => {
  const context = await loadCurrentContext(request, response);

  if (!context) {
    return;
  }

  const organizationId = request.body?.organizationId;

  if (organizationId === null && context.user.role === "platform_admin") {
    delete request.session.active_organization_id;
  } else {
    const organization = context.organizations.find((item) => item.id === organizationId);

    if (!organization) {
      return sendError(response, 403, "ORGANIZATION_FORBIDDEN", "You cannot access this organization.");
    }

    request.session.active_organization_id = organization.id;
  }

  await saveSession(request);
  response.json(toPayload(
    context.user,
    context.organizations,
    request.session.active_organization_id,
  ));
});

authRouter.post("/logout", requireTrustedOrigin, async (request, response) => {
  await destroySession(request);
  response.clearCookie(cookieName, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  response.sendStatus(204);
});

module.exports = {
  authRouter,
};
