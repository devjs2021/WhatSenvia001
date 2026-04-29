import crypto from "crypto";
import { FastifyRequest, FastifyReply } from "fastify";
import { AuthService } from "../services/auth.service.js";
import { registerSchema, loginSchema } from "../schemas/auth.schema.js";
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
    return success(reply, { user, token }, 201);
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
    return success(reply, { user, token });
  } catch (err: any) {
    return error(reply, err.message, 401);
  }
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

    // Decode signature
    const sig = Buffer.from(encoded_sig.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    
    // Create expected signature
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest();

    // Verify
    if (!crypto.timingSafeEqual(sig, expectedSig)) {
      return error(reply, "Invalid signature", 401);
    }

    // Decode and parse payload
    const data = JSON.parse(
      Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString()
    );
    
    const facebookId = data.user_id;
    if (!facebookId) {
      return error(reply, "User ID not found in payload", 400);
    }

    // Delete all user data
    const deletedId = await authService.deleteByFacebookId(facebookId);

    // If user not found, we still return success to Meta but with a placeholder confirmation
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
