import { IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class GenerateInputDto {
  @IsString() title!: string;
  @IsString() url!: string;
  @IsString() content!: string;
}

class GenerateOptionsDto {
  @IsIn(['neutral', 'professional', 'casual']) tone!: 'neutral' | 'professional' | 'casual';
  @IsIn(['short', 'medium', 'long']) length!: 'short' | 'medium' | 'long';
  @IsString() language!: string;
  @IsOptional() @IsString() model?: string;
}

export class GenerateThreadDto {
  @ValidateNested() @Type(() => GenerateInputDto) input!: GenerateInputDto;
  @ValidateNested() @Type(() => GenerateOptionsDto) options!: GenerateOptionsDto;
  @IsIn(['single', 'priority']) providerMode!: 'single' | 'priority';
  @IsOptional() @IsIn(['claude', 'chatgpt', 'gemini', 'grok']) provider?: 'claude' | 'chatgpt' | 'gemini' | 'grok';
}
