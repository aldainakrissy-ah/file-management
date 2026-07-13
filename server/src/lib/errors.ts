export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const notFound = (what: string) => new ApiError(404, `${what} not found`);
export const forbidden = (message = "You do not have access to this resource") =>
  new ApiError(403, message);
export const badRequest = (message: string) => new ApiError(400, message);
export const unauthorized = (message = "Authentication required") =>
  new ApiError(401, message);
