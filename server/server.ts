require("dotenv").config();
import helmet from "helmet";
import conn from "./config/database";
import morgen from "morgan";
import hpp from "hpp";
import { Request, Response } from "express";
import AuthRouter from "./Routes/AuthRoute";
import BlogRouter from "./Routes/BlogRoutes";
import CommentRouter from "./Routes/CommentRoutes";
const compression = require("compression");
const express = require("express");
const http = require("http");
const sanitize = require("express-mongo-sanitize");
const app = express();
const server = http.createServer(app);
const cookieParser = require("cookie-parser");
const path = require("path");
const cors = require("cors");
const nodemailer = require('nodemailer');

const corsOptions = {
  origin: "*",
  credentials: true,
};

app.use(express.json());
app.use(cors(corsOptions));
app.use(helmet());
app.use(compression());
app.use(sanitize());
app.use(morgen("dev"));
app.use(hpp());
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "build")));

// Handle any requests that don't match the static files
// app.get("*", (req: Request, res: Response) => {
//   res.sendFile(path.join(__dirname, '../app/dist', 'index.html'));
// });
app.get("/", (req: Request, res: Response) => {
  res.send("server is running 🔥🔥🔥");
});
const createTransporter = () => {
  const service = process.env.EMAIL_SERVICE || 'gmail';
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  if (!user || !pass) {
    throw new Error('Email credentials not configured. Set EMAIL_USER and EMAIL_PASSWORD in .env');
  }

  return nodemailer.createTransport({
    service: service,
    auth: {
      user: user,
      pass: pass,
    },
  });
};

/**
 * Generate HTML email template matching the design
 */
const generateEmailTemplate = (recipientName = 'User') => {
  const appUrl = 'https://socialite-ashutosh.vercel.app/';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Activity on your Account</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #f5f5f5;
        }
        .header {
            background-color: #333333;
            padding: 20px;
            text-align: center;
        }
        .header-text {
            color: #ffffff;
            font-weight: bold;
            font-size: 18px;
            margin: 0;
            font-family: Arial, sans-serif;
        }
        .content {
            background-color: #ffffff;
            padding: 40px 30px;
        }
        .heading {
            font-size: 24px;
            font-weight: bold;
            color: #000000;
            margin: 0 0 20px 0;
            font-family: Arial, sans-serif;
        }
        .paragraph {
            font-size: 16px;
            color: #000000;
            line-height: 1.6;
            margin: 0 0 15px 0;
            font-family: Arial, sans-serif;
        }
        .link {
            color: #0066cc;
            text-decoration: underline;
            font-family: Arial, sans-serif;
        }
        .disclaimer {
            font-size: 14px;
            color: #000000;
            line-height: 1.6;
            margin: 20px 0;
            font-family: Arial, sans-serif;
        }
        .closing {
            font-size: 16px;
            color: #000000;
            margin: 20px 0 5px 0;
            font-family: Arial, sans-serif;
        }
        .signature {
            font-size: 16px;
            font-weight: bold;
            color: #000000;
            margin: 0;
            font-family: Arial, sans-serif;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <p class="header-text">Socialite : Social Media App</p>
        </div>
        <div class="content">
            <h1 class="heading">New Activity on your Account</h1>
            <p class="paragraph">There's new activity on your account! 👉</p>
            <p class="paragraph">You can view the full update directly in your Socialite feed:</p>
            <p class="paragraph">
                <a href="${appUrl}" class="link">👉 View Activity</a>
            </p>
            <p class="disclaimer">
                If you didn't perform this action or believe it's suspicious, please ignore this email — your account remains secure.
            </p>
            <p class="closing">Stay connected,</p>
            <p class="signature">The Socialite Team</p>
        </div>
    </div>
</body>
</html>
  `.trim();
};

/**
 * POST /api/send-notification-email
 * Send notification email to recipient
 */
app.post('/api/send-notification-email', async (req, res) => {
  try {
    const { to, subject, recipientName } = req.body;

    // Validate required fields
    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Email address (to) is required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address format',
      });
    }

    // Create transporter
    const transporter = createTransporter();

    // Generate HTML template
    const htmlContent = generateEmailTemplate(recipientName);

    // Email options
    const mailOptions = {
      from: `"Socialite" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject || 'New Activity on your Account',
      html: htmlContent,
      text: `New Activity on your Account\n\nThere's new activity on your account!\n\nYou can view the full update directly in your Socialite feed:\n${process.env.APP_URL || 'https://socialite-ashutosh.vercel.app/'}\n\nIf you didn't perform this action or believe it's suspicious, please ignore this email — your account remains secure.\n\nStay connected,\nThe Socialite Team`,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent successfully:', info.messageId);

    res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});
app.use("/auth", AuthRouter);
app.use("/blog", BlogRouter);
app.use("/comment", CommentRouter);

const PORT = process.env.PORT || 4000;

conn.then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

export default app
