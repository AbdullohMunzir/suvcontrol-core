import { Controller, Get, Post, Body, Param, UseGuards, Patch, Delete } from '@nestjs/common';
import { AddressService } from './address.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('address')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Roles('TENANT')
  @Post('mahallas')
  createMahalla(@Body() body: { name: string }) {
    return this.addressService.createMahalla(body.name);
  }

  @Get('mahallas')
  getMahallas() {
    return this.addressService.getMahallas();
  }

  @Roles('TENANT')
  @Post('mahallas/:id/streets')
  createStreet(@Param('id') mahallaId: string, @Body() body: { name: string }) {
    return this.addressService.createStreet(mahallaId, body.name);
  }

  @Get('mahallas/:id/streets')
  getStreets(@Param('id') mahallaId: string) {
    return this.addressService.getStreets(mahallaId);
  }

  @Roles('TENANT')
  @Patch('mahallas/:id')
  updateMahalla(@Param('id') id: string, @Body() body: { name: string }) {
    return this.addressService.updateMahalla(id, body.name);
  }

  @Roles('TENANT')
  @Delete('mahallas/:id')
  deleteMahalla(@Param('id') id: string) {
    return this.addressService.deleteMahalla(id);
  }

  @Roles('TENANT')
  @Patch('streets/:id')
  updateStreet(@Param('id') id: string, @Body() body: { name: string }) {
    return this.addressService.updateStreet(id, body.name);
  }

  @Roles('TENANT')
  @Delete('streets/:id')
  deleteStreet(@Param('id') id: string) {
    return this.addressService.deleteStreet(id);
  }
}
