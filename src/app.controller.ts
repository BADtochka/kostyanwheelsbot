import { Controller, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('/upload')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'file' }]))
  async uploadFile(@UploadedFiles() files: { file: Express.Multer.File[] }) {
    return await this.appService.uploadFile(files.file);
  }
}
