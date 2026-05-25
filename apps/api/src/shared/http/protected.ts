import { createAuthService } from "../../modules/auth/auth.service.js";
import { usersRepository } from "../../modules/users/users.repository.js";
import { createRequireAuth } from "./auth.js";

const authService = createAuthService(usersRepository);

export const requireAuth = createRequireAuth(authService.authenticate);
