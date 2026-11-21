import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService
  ){}
  
  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const authorization = request.headers.authorization;

      // console.log("🔥 Authorization header:", authorization);

    if (!authorization) {
      // console.log("❌ Authorization header missing");
      throw new UnauthorizedException('Authorization header is missing');
    }

    const [type, token] = authorization.split(' ');

    // console.log("🔥 Type:", type);
    // console.log("🔥 Token exists:", !!token);

    if (type !== 'Bearer' || !token) {
      // console.log("❌ Invalid authorization format");
      throw new UnauthorizedException('Invalid authorization header');
    }
    
    try {
      // console.log("🔥 Verifying JWT...");
      const payload = await this.jwtService.verifyAsync(token);

      // console.log("✅ JWT VALID:", payload);
      request.user = payload;

      return true;
    } catch(error) {
      // console.log("❌ JWT VERIFICATION FAILED:", error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
