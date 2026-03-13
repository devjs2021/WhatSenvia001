import { FastifyRequest, FastifyReply } from "fastify";
import { AuthService } from "../services/auth.service.js";
import { registerSchema, loginSchema } from "../schemas/auth.schema.js";
import { success, error } from "../../../shared/utils/api-response.js";

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
