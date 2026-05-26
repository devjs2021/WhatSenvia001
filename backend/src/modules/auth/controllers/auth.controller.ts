import crypto from "crypto";
import { FastifyRequest, FastifyReply } from "fastify";
import { AuthService } from "../services/auth.service.js";
import { registerSchema, loginSchema, googleAuthSchema, forgotPasswordSchema, resetPasswordSchema } from "../schemas/auth.schema.js";
import { success, error } from "../../../shared/utils/api-response.js";
import { env } from "../../../config/env.js";

const authService = new AuthService();

export async function registerController(request: FastifyRequest, reply: FastifyReply) {
  const parsed = registerSchema.safeParse(request.body);
  if (!parsed.success) {
    return error(reply, parsed.error.errors[0].message, 422);
  }

  try {
    const user = await authService.register(parsed.data);
    const token = await reply.jwtSign({ id: user.id, email: user.email, name: user.name, role: user.role });
    const refreshToken = await authService.createRefreshToken(user.id, request.headers["user-agent"]);
    return success(reply, { user, token, refreshToken }, 201);
  } catch (err: any) {
    return error(reply, err.message, 409);
  }
}

export async function loginController(request: FastifyRequest, reply: FastifyReply) {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) {
    return error(reply, parsed.error.errors[0].message, 422);
  }

  try {
    const user = await authService.login(parsed.data);
    const token = await reply.jwtSign({ id: user.id, email: user.email, name: user.name, role: user.role });
    const refreshToken = await authService.createRefreshToken(user.id, request.headers["user-agent"]);
    return success(reply, { user, token, refreshToken });
  } catch (err: any) {
    return error(reply, err.message, 401);
  }
}

export async function googleAuthController(request: FastifyRequest, reply: FastifyReply) {
  const parsed = googleAuthSchema.safeParse(request.body);
  if (!parsed.success) {
    return error(reply, parsed.error.errors[0].message, 422);
  }

  try {
    const result = await authService.googleAuth(parsed.data);
    const token = await reply.jwtSign({ id: result.user.id, email: result.user.email, name: result.user.name, role: result.user.role });
    const refreshToken = await authService.createRefreshToken(result.user.id, request.headers["user-agent"]);
    return success(reply, { user: result.user, token, refreshToken, isNewUser: result.isNewUser });
  } catch (err: any) {
    return error(reply, err.message, 401);
  }
}

export async function forgotPasswordController(request: FastifyRequest, reply: FastifyReply) {
  const parsed = forgotPasswordSchema.safeParse(request.body);
  if (!parsed.success) {
    return error(reply, parsed.error.errors[0].message, 422);
  }

  try {
    await authService.forgotPassword(parsed.data.email);
    // Always return success to avoid email enumeration
    return success(reply, { message: "If the email exists, a reset code has been sent" });
  } catch (err: any) {
    return success(reply, { message: "If the email exists, a reset code has been sent" });
  }
}

export async function resetPasswordController(request: FastifyRequest, reply: FastifyReply) {
  const parsed = resetPasswordSchema.safeParse(request.body);
  if (!parsed.success) {
    return error(reply, parsed.error.errors[0].message, 422);
  }

  try {
    await authService.resetPassword(parsed.data);
    return success(reply, { message: "Password reset successfully" });
  } catch (err: any) {
    return error(reply, err.message, 400);
  }
}

export async function refreshController(request: FastifyRequest, reply: FastifyReply) {
  const { refreshToken } = request.body as { refreshToken?: string };
  if (!refreshToken) {
    return error(reply, "Refresh token is required", 400);
  }

  try {
    const { user, newRefreshToken } = await authService.refreshAccessToken(refreshToken);
    const token = await reply.jwtSign({ id: user.id, email: user.email, name: user.name, role: user.role });
    return success(reply, { token, refreshToken: newRefreshToken });
  } catch (err: any) {
    return error(reply, err.message, 401);
  }
}

export async function logoutController(request: FastifyRequest, reply: FastifyReply) {
  const { refreshToken } = request.body as { refreshToken?: string };
  if (refreshToken) {
    await authService.revokeRefreshToken(refreshToken);
  }
  return success(reply, { message: "Logged out" });
}

export async function profileController(request: FastifyRequest, reply: FastifyReply) {
  const user = await authService.getProfile((request as any).user.id);
  if (!user) return error(reply, "User not found", 404);
  return success(reply, user);
}

export async function dataDeletionController(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as any;
  const signed_request = body?.signed_request;

  if (!signed_request) {
    return error(reply, "Missing signed_request", 400);
  }

  try {
    const [encoded_sig, payload] = signed_request.split(".");
    if (!encoded_sig || !payload) throw new Error("Invalid format");

    const secret = env.META_APP_SECRET;
    if (!secret) {
      return error(reply, "Meta App Secret not configured in server", 500);
    }

    const sig = Buffer.from(encoded_sig.replace(/-/g, "+").replace(/_/g, "/"), "base64");

    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest();

    if (!crypto.timingSafeEqual(sig, expectedSig)) {
      return error(reply, "Invalid signature", 401);
    }

    const data = JSON.parse(
      Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString()
    );

    const facebookId = data.user_id;
    if (!facebookId) {
      return error(reply, "User ID not found in payload", 400);
    }

    const deletedId = await authService.deleteByFacebookId(facebookId);

    const confirmationCode = deletedId || `req_${Date.now()}`;
    const statusUrl = `https://www.crmcontactsop.uk/deletion-status?id=${confirmationCode}`;

    return reply.send({
      url: statusUrl,
      confirmation_code: confirmationCode,
    });
  } catch (err: any) {
    return error(reply, "Invalid signed_request: " + err.message, 400);
  }
}
