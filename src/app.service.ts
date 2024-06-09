import { Injectable } from '@nestjs/common';
import { pathExists, writeFile } from 'fs-extra';
import { normalize, resolve } from 'path';
import { appConfig } from './config/config';

@Injectable()
export class AppService {
  async uploadFile(files: Express.Multer.File[]) {
    const { uploadPath } = appConfig;
    const isPathExist = await pathExists(uploadPath);
    if (isPathExist) {
      files.map(async (file) => {
        const { buffer } = file;
        const fileFull = resolve(appConfig.uploadPath, normalize(file.originalname));
        await writeFile(fileFull, buffer);
      });
    }
  }
}
