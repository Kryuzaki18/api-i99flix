import { Type } from "@sinclair/typebox";

export const ErrorBody = Type.Object({
  error: Type.String(),
  details: Type.Optional(Type.Any()),
});

export const BearerAuth = [{ bearerAuth: [] }];

export const StandardErrors = {
  400: ErrorBody,
  401: ErrorBody,
  500: ErrorBody,
};
