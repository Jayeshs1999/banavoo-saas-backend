# Cloudinary Image Upload Integration Guide

This guide explains the image upload functionality using Cloudinary, Multer, and Multer Storage Cloudinary.

## Overview

The system now supports uploading PG images directly to Cloudinary during PG creation. Images are stored in the cloud and URLs are saved in the database.

## Setup Instructions

### 1. Create a Cloudinary Account

1. Go to [Cloudinary](https://cloudinary.com/)
2. Sign up for a free account
3. After logging in, go to the Dashboard
4. Note down the following credentials:
   - Cloud Name
   - API Key
   - API Secret

### 2. Configure Environment Variables

Update the `bookshop/.env` file with your Cloudinary credentials:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
CLOUDINARY_API_KEY=your_actual_api_key
CLOUDINARY_API_SECRET=your_actual_api_secret
```

**Important:** Never commit your actual Cloudinary credentials to version control. The `.env` file is in `.gitignore`.

### 3. Install Dependencies

The required packages have been installed:

- `cloudinary` - Cloudinary SDK
- `multer-storage-cloudinary` - Multer storage engine for Cloudinary

If you need to reinstall:

```bash
cd bookshop
npm install cloudinary multer-storage-cloudinary
```

## How It Works

### Backend Implementation

#### Files Created/Modified:

1. **`backend/config/cloudinary.js`** - Cloudinary configuration and multer setup
   - Configures Cloudinary with environment variables
   - Sets up multer storage engine with Cloudinary
   - Defines upload limits (5MB max) and allowed formats (jpg, jpeg, png, webp)
   - Applies automatic image transformations

2. **`backend/controllers/uploadController.js`** - Upload handlers
   - `uploadImage` - Handles single image upload
   - `uploadMultipleImages` - Handles multiple image upload (up to 10)
   - `deleteImage` - Deletes image from Cloudinary by public ID

3. **`backend/routes/uploadRoutes.js`** - Upload API routes
   - `POST /api/upload` - Upload single image
   - `POST /api/upload/multiple` - Upload multiple images
   - `DELETE /api/upload/:publicId` - Delete image

4. **`backend/server.js`** - Updated to include upload routes

### Frontend Implementation

The frontend already has the upload functionality integrated:

1. **`dormitory/services/api.ts`** - Contains `uploadAPI.uploadImage()` function
   - Sends images as FormData
   - Includes authentication token
   - Returns image URL

2. **`dormitory/app/admin/create-pg/page.tsx`** - Create PG page
   - Has image upload UI
   - Displays uploaded images
   - Allows removing images before PG creation
   - Sends image URLs with PG data

## API Endpoints

### Upload Single Image

```http
POST /api/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Request Body:
- image: (file)

Response:
{
  "success": true,
  "imageUrl": "https://res.cloudinary.com/...",
  "publicId": "pg-images/abc123",
  "secureUrl": "https://res.cloudinary.com/..."
}
```

### Upload Multiple Images

```http
POST /api/upload/multiple
Authorization: Bearer <token>
Content-Type: multipart/form-data

Request Body:
- images: (array of files, max 10)

Response:
{
  "success": true,
  "images": [
    {
      "imageUrl": "https://res.cloudinary.com/...",
      "publicId": "pg-images/abc123",
      "secureUrl": "https://res.cloudinary.com/..."
    }
  ]
}
```

### Delete Image

```http
DELETE /api/upload/:publicId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Image deleted successfully",
  "result": { ... }
}
```

## Configuration Details

### Upload Settings

- **Max file size:** 5MB
- **Allowed formats:** jpg, jpeg, png, webp
- **Storage folder:** pg-images
- **Auto-transformation:** Images are automatically resized (max 1200x800) and optimized

### CORS Configuration

The server is configured to accept uploads from:

- http://localhost:3000
- https://dormitory-alpha.vercel.app
- https://www.bedwale.in

## Testing

### Using Swagger UI

1. Start the backend server: `npm run dev`
2. Go to http://localhost:5000/api-docs
3. Authenticate with your admin token
4. Use the Upload endpoints to test

### Using cURL

```bash
# Upload single image
curl -X POST http://localhost:5000/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/image.jpg"

# Upload multiple images
curl -X POST http://localhost:5000/api/upload/multiple \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg"
```

## Troubleshooting

### Common Issues

1. **"No image file provided"**
   - Make sure you're sending the file with the correct field name ("image" for single, "images" for multiple)

2. **"Only image files are allowed"**
   - Ensure you're uploading valid image files (jpg, jpeg, png, webp)

3. **"File too large"**
   - Images must be under 5MB. Compress or resize before uploading.

4. **Cloudinary configuration errors**
   - Verify your environment variables are set correctly
   - Check that your Cloudinary account is active

5. **CORS errors**
   - Ensure your frontend URL is in the CORS whitelist in server.js

### Debug Mode

To debug Cloudinary issues, add logging to `backend/config/cloudinary.js`:

```javascript
console.log("Cloudinary Config:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  // Never log api_secret
});
```

## Security Considerations

1. **Authentication Required** - All upload endpoints require admin authentication
2. **File Type Validation** - Only image files are accepted
3. **Size Limits** - 5MB maximum file size
4. **CORS Protection** - Only approved origins can upload
5. **API Secret Protection** - Never expose your Cloudinary API secret

## Cost Management

Cloudinary's free tier includes:

- 25 GB of storage
- 25 GB of bandwidth per month
- Unlimited transformations

Monitor your usage in the Cloudinary dashboard to avoid unexpected charges.

## Next Steps

1. Set up your Cloudinary account and update `.env`
2. Test the upload functionality
3. Deploy to production with your actual Cloudinary credentials
4. Monitor usage and adjust settings as needed

## Support

For Cloudinary-specific issues, refer to:

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Multer Storage Cloudinary GitHub](https://github.com/affanvinted/multer-storage-cloudinary)

For application issues, check the server logs and console output.
