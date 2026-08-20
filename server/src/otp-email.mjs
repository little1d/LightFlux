import nodemailer from 'nodemailer';

const asBoolean = (value, fallback = false) =>
  value === undefined ? fallback : value === 'true';

const messageForType = (type) => {
  switch (type) {
    case 'change-email':
      return 'Use this code to confirm your new LightFlux email address.';
    case 'email-verification':
      return 'Use this code to verify your LightFlux email address.';
    case 'forget-password':
      return 'Use this code to reset your LightFlux password.';
    default:
      return 'Use this code to sign in to LightFlux.';
  }
};

export const otpEmailConfigFromEnvironment = () => {
  const mode =
    process.env.OTP_DELIVERY ??
    (process.env.SMTP_HOST ? 'smtp' : 'log');
  if (!['log', 'smtp'].includes(mode)) {
    throw new Error('OTP_DELIVERY must be either "log" or "smtp".');
  }
  if (process.env.NODE_ENV === 'production' && mode !== 'smtp') {
    throw new Error('Production email authentication requires SMTP.');
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('SMTP_PORT must be a positive integer.');
  }

  const config = {
    mode,
    from: process.env.SMTP_FROM ?? 'LightFlux <no-reply@localhost>',
    host: process.env.SMTP_HOST ?? '',
    password: process.env.SMTP_PASSWORD ?? '',
    port,
    secure: asBoolean(process.env.SMTP_SECURE, port === 465),
    user: process.env.SMTP_USER ?? '',
  };

  if (
    mode === 'smtp' &&
    (!config.host || !config.user || !config.password || !config.from)
  ) {
    throw new Error(
      'SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM are required.',
    );
  }
  return config;
};

export const createOtpEmailSender = (config) => {
  if (config.mode === 'log') {
    return {
      close: () => {},
      mode: 'log',
      send: async ({ email, otp, type }) => {
        console.info(`[LightFlux OTP] ${type} ${email}: ${otp}`);
      },
    };
  }

  const transporter = nodemailer.createTransport({
    auth: {
      pass: config.password,
      user: config.user,
    },
    host: config.host,
    port: config.port,
    secure: config.secure,
  });

  return {
    close: () => transporter.close(),
    mode: 'smtp',
    send: async ({ email, otp, type }) => {
      const message = messageForType(type);
      await transporter.sendMail({
        from: config.from,
        to: email,
        subject: `${otp} is your LightFlux verification code`,
        text: `${message}\n\n${otp}\n\nThis code expires in 5 minutes. If you did not request it, ignore this email.`,
        html: [
          '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#2e2f41;line-height:1.6">',
          '<h1 style="font-size:20px;margin:0 0 12px">LightFlux</h1>',
          `<p style="margin:0 0 18px">${message}</p>`,
          `<p style="font-size:30px;font-weight:700;letter-spacing:8px;margin:0 0 18px">${otp}</p>`,
          '<p style="color:#858797;font-size:13px;margin:0">This code expires in 5 minutes. If you did not request it, ignore this email.</p>',
          '</div>',
        ].join(''),
      });
    },
  };
};
