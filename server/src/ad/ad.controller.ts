import { Controller, 
        Post, 
        Body,
        UseGuards, 
        Req, 
        Get, 
        Query, 
        Param, 
        DefaultValuePipe, 
        ParseIntPipe, 
        Patch, 
        Delete, 
        ParseEnumPipe } from '@nestjs/common';
import { AdService } from './ad.service.js';
import { PostAdDto } from './dto/postAd.dto.js';
import { AuthGuard } from '../auth/guards/auth/auth.guard.js';
import type { Request } from 'express';
import { MetricsService } from '../infrastructure/metrics/metrics.service.js';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import { UpdateAdDto } from './dto/updateAd.dto.js';
import { AdType } from './enum/adType.enum.js';

@Controller('ad')
export class AdController {
    constructor(
        private readonly adService: AdService,
        private readonly metrics: MetricsService
    ){}

    @UseGuards(AuthGuard)
    @Post()
    async postTelegramUserAd(
        @Req() req: Request,
        @Body() dto: PostAdDto
    ){
        const timer = this.metrics.start('AdController.postTelegramUserAd');
        try{
            // console.log("Requesting body:",dto);
            return await this.adService.postTelegramUserAd(dto, req.user.sub);
        }catch(err: any){
            console.error("Error in AdController.postTelegramUserAd:", err);
            return { success: false, error: err.message };
        }finally{
            timer.end();
        }
    }

    @UseGuards(AuthGuard)
    @Get('latest')
    async getLatestAdsForTelegramUser(
        @Query('cursor') cursor?: string, 
        @Query('limit') limit?: string
    ) {
        return await this.adService.getLatestAdsForTelegramUser(cursor, limit ? Number(limit) : 10);
    }

    @UseGuards(AuthGuard)
    @Get('search')
    async searchAds(
        @Query('from') fromLocation:  Varchar<500>, 
        @Query('to') toLocation: Varchar<500>, 
        @Query('date') date: string, 
        @Query('cursor') cursor: string, 
        @Query('passenger') passenger: number, 
        @Query('limit') limit: number,
        @Query('type', new ParseEnumPipe(AdType, { optional: true })) type?: AdType
    ){
        return await this.adService.searchAds(fromLocation, toLocation, date, passenger, cursor, limit, type);
    }

    @UseGuards(AuthGuard)
    @Get('user')
    async getTelegramUserAds(
        @Req() req: Request,
        @Query('cursor') cursor?: string, 
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) 
        limit?: string
    ){
        return await this.adService.getTelegramUserAds(BigInt(req.user.sub), cursor, limit ? Number(limit) : 10);
    }

    @UseGuards(AuthGuard)
    @Get(':id')
    async getAdByIdForTelegramUser(
        @Param('id') id: string
    ){
        return await this.adService.getAdByIdForTelegramUser(id);
    }

    @UseGuards(AuthGuard)
    @Patch(':id')
    async updateTelegramUserAdById(
        @Req() req: Request, 
        @Param('id') id: string, 
        @Body() dto: UpdateAdDto
    ){
        return await this.adService.updateTelegramUserAdById(BigInt(req.user.sub), BigInt(id), dto);
    }

    @UseGuards(AuthGuard)
    @Delete(':id')
    async deleteTelegramUserAdById(
        @Req() req: Request,
        @Param('id') id: string
    ){
        return await this.adService.deleteTelegramUserAdById(BigInt(req.user.sub), BigInt(id));
    }
}
