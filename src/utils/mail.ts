import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST!,
  port: Number(process.env.SMTP_PORT!) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },
});

export async function sendVerificationEmail(to: string, link: string) {
  await transporter.sendMail({
    from: '"BoilerPLate" <whrite.arthur@gmail.com>',
    to,
    subject: "Verify your email address",
    html: `
      <p>Click the link below to verify your email address:</p>
      <a href="${link}">${link}</a>
      <p>This link will expire in 15 minutes.</p>
    `,
  });
}

export async function sendResetPasswordEmail(to: string, link: string) {
  await transporter.sendMail({
    from: '"BoilerPLate" <whrite.arthur@gmail.com>',
    to,
    subject: "Reset your password",
    html: `
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${link}">${link}</a>
      <p>This link will expire in 15 minutes. If you did not request this, please ignore this email.</p>
    `,
  });
}
