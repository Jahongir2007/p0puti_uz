import { Controller, Get, Req, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth/auth.guard.js';
import { VehicleService } from './vehicle.service.js';
import type { Request } from 'express';
import { CreateVehicleDto } from './dto/createVehicle.dto.js';
import { UpdateVehicleDto } from './dto/updateVehicle.dto.js';

@Controller('vehicle')
export class VehicleController {
    constructor(
        private readonly vehicleService: VehicleService
    ){}

    @UseGuards(AuthGuard)
    @Get()
    async getTelegramUserVehicle(@Req() req: Request){
        // console.log("Req:", req);
        return await this.vehicleService.getTelegramUserVehiclesByUserId(req.user.sub);
    }

    @UseGuards(AuthGuard)
    @Post()
    async createTelegramUserVehicle(
        @Req() req: Request,
        @Body() dto: CreateVehicleDto
    ){
        return await this.vehicleService.createTelegramUserVehicle(dto, req.user.sub);
    }

    @UseGuards(AuthGuard)
    @Patch(':vehicleId')
    async updateTelegramUserVehicle(
        @Req() req: Request,
        @Param('vehicleId') vehicleId: string,
        @Body() dto: UpdateVehicleDto
    ){
        return await this.vehicleService.updateTelegramUserVehicle(dto, req.user.sub, BigInt(vehicleId));
    }

    @UseGuards(AuthGuard)
    @Delete(':vehicleId')
    async deleteTelegramUserVehicle(
        @Req() req: Request,
        @Param('vehicleId') vehicleId: string
    ){
        return await this.vehicleService.deleteTelegramUserVehicle(req.user.sub, BigInt(vehicleId));
    }
}
