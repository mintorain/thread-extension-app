import { Body, Controller, Post } from '@nestjs/common';
import { IsString } from 'class-validator';

class ExtractContentDto {
  @IsString()
  url!: string;
}

@Controller('v1/content')
export class ContentController {
  @Post('extract')
  extract(@Body() dto: ExtractContentDto) {
    return {
      title: '샘플 기사 제목',
      url: dto.url,
      publishedAt: null,
      content: '정제된 본문 텍스트 샘플입니다.',
      source: dto.url.includes('//') ? dto.url.split('/')[2] : 'unknown',
    };
  }
}
