import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Env } from '../config/config.schema.js';

/**
 * Sends transactional email via SMTP when configured. In dev (no SMTP) it logs
 * to the server console and returns false so callers can surface a dev link.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  async send(to: string, subject: string, text: string, html?: string): Promise<boolean> {
    const host = this.config.get('SMTP_HOST', { infer: true });
    if (!host) {
      this.logger.log(`[dev] Email to ${to} — "${subject}" (SMTP not configured):\n${text}`);
      return false;
    }
    try {
      const port = this.config.get('SMTP_PORT', { infer: true }) ?? 587;
      const user = this.config.get('SMTP_USER', { infer: true });
      const transport = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user ? { user, pass: this.config.get('SMTP_PASS', { infer: true }) } : undefined,
      });
      await transport.sendMail({
        from: this.config.get('SMTP_FROM', { infer: true }) ?? user ?? 'no-reply@gnevo.local',
        to,
        subject,
        text,
        ...(html ? { html } : {}),
      });
      return true;
    } catch (e) {
      this.logger.warn(`Email send failed to ${to}: ${e}`);
      return false;
    }
  }
}
