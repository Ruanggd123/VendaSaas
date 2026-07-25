declare module "nodemailer" {
  interface TransportOptions {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  }

  interface MailOptions {
    from: string;
    to: string;
    subject: string;
    html: string;
  }

  interface Transporter {
    sendMail(options: MailOptions): Promise<unknown>;
  }

  const nodemailer: {
    createTransport(options: TransportOptions): Transporter;
  };

  export default nodemailer;
}
