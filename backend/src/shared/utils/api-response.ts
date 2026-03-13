import { FastifyReply } from "fastify";

export function success<T>(reply: FastifyReply, data: T, statusCode = 200) {
  return reply.status(statusCode).send({ success: true, data });
}

export function error(reply: FastifyReply, message: string, statusCode = 400) {
  return reply.status(statusCode).send({ success: false, error: message });
}

export function paginated<T>(
  reply: FastifyReply,
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return reply.status(200).send({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}
