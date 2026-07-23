import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  UploadedAsset,
  UploadedAssetDocument,
  AssetProvider,
} from './schemas/uploaded-asset.schema';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(
    @InjectModel(UploadedAsset.name)
    private readonly assetModel: Model<UploadedAssetDocument>,
    private readonly configService: ConfigService,
  ) {
    this.uploadDir = this.configService.get<string>(
      'app.uploadDir',
      './uploads',
    );
    this.baseUrl = this.configService.get<string>(
      'app.appUrl',
      'http://localhost:4000',
    );
  }

  async upload(
    file: Express.Multer.File,
    folder?: string,
    userId?: string,
  ): Promise<UploadedAssetDocument> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const uploadPath = folder
      ? path.join(this.uploadDir, folder)
      : this.uploadDir;

    try {
      await fs.mkdir(uploadPath, { recursive: true });
    } catch {
      // directory already exists
    }

    const filename = `${randomUUID()}${path.extname(file.originalname)}`;
    const filePath = path.join(uploadPath, filename);

    await fs.writeFile(filePath, file.buffer);

    const relativePath = folder
      ? `/uploads/${folder}/${filename}`
      : `/uploads/${filename}`;
    const url = `${this.baseUrl}${relativePath}`;

    const asset = await this.assetModel.create({
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url,
      provider: AssetProvider.LOCAL,
      folder: folder ?? undefined,
      uploadedBy: userId ?? undefined,
    });

    return asset;
  }

  async delete(assetId: string): Promise<{ deleted: boolean }> {
    const asset = await this.assetModel.findById(assetId).exec();
    if (!asset) {
      throw new NotFoundException(`Asset with id "${assetId}" not found`);
    }

    try {
      if (asset.provider === AssetProvider.LOCAL && asset.filename) {
        const relativePath = asset.folder
          ? path.join(this.uploadDir, asset.folder, asset.filename)
          : path.join(this.uploadDir, asset.filename);
        await fs.unlink(relativePath);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'File system error';
      this.logger.warn(`Failed to delete file from disk: ${message}`);
    }

    await this.assetModel.findByIdAndDelete(assetId).exec();
    return { deleted: true };
  }

  async findByUrl(url: string): Promise<UploadedAssetDocument | null> {
    return this.assetModel.findOne({ url }).exec();
  }

  async getById(id: string): Promise<UploadedAssetDocument> {
    const asset = await this.assetModel.findById(id).exec();
    if (!asset) {
      throw new NotFoundException(`Asset with id "${id}" not found`);
    }
    return asset;
  }

  async getUploadsByUser(userId: string) {
    return this.assetModel
      .find({ uploadedBy: userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAll(query: { page?: number; limit?: number; folder?: string }) {
    const { page = 1, limit = 20, folder } = query;
    const filter: DynamicRecord = {};
    if (folder) filter.folder = folder;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.assetModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.assetModel.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
