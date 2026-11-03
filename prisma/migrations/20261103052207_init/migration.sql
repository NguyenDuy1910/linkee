-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "SocialProvider" AS ENUM ('INSTAGRAM', 'FACEBOOK');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('ACTIVE', 'NEEDS_RECONNECT');

-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('NEW', 'REPLIED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ReplySource" AS ENUM ('AI', 'MANUAL', 'AUTO');

-- CreateEnum
CREATE TYPE "ReplyStatus" AS ENUM ('DRAFT', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "BrandTone" AS ENUM ('FRIENDLY', 'PROFESSIONAL', 'PLAYFUL');

-- CreateEnum
CREATE TYPE "AiPurpose" AS ENUM ('SUGGESTION', 'AUTO_REPLY');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "TargetStatus" AS ENUM ('PENDING', 'PUBLISHING', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BioPage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT NOT NULL DEFAULT '',
    "avatarMediaId" TEXT,
    "theme" JSONB NOT NULL,
    "socialLinks" JSONB NOT NULL DEFAULT '[]',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BioPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BioLink" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BioLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "SocialProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "username" TEXT,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "accountType" TEXT,
    "scopes" TEXT[],
    "accessTokenEnc" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3),
    "tokenRefreshedAt" TIMESTAMP(3),
    "status" "ConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "statusMessage" TEXT,
    "webhooksSubscribed" BOOLEAN NOT NULL DEFAULT false,
    "autoReplyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramComment" (
    "id" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "igCommentId" TEXT NOT NULL,
    "igMediaId" TEXT NOT NULL,
    "parentIgCommentId" TEXT,
    "mediaCaption" TEXT,
    "mediaPermalink" TEXT,
    "mediaThumbnailUrl" TEXT,
    "authorUsername" TEXT,
    "authorIgId" TEXT,
    "text" TEXT NOT NULL,
    "commentedAt" TIMESTAMP(3) NOT NULL,
    "status" "CommentStatus" NOT NULL DEFAULT 'NEW',
    "replyLockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentReply" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "source" "ReplySource" NOT NULL,
    "status" "ReplyStatus" NOT NULL DEFAULT 'DRAFT',
    "settingsKey" TEXT,
    "model" TEXT,
    "remoteReplyId" TEXT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommentReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiSettings" (
    "userId" TEXT NOT NULL,
    "tone" "BrandTone" NOT NULL DEFAULT 'FRIENDLY',
    "language" TEXT NOT NULL DEFAULT 'auto',
    "brandContext" TEXT NOT NULL DEFAULT '',
    "skipKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "socialAccountId" TEXT,
    "commentId" TEXT,
    "purpose" "AiPurpose" NOT NULL,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "costUsd" DECIMAL(12,6),
    "latencyMs" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostMedia" (
    "postId" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "PostMedia_pkey" PRIMARY KEY ("postId","mediaAssetId")
);

-- CreateTable
CREATE TABLE "PostTarget" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "socialAccountId" TEXT,
    "provider" "SocialProvider" NOT NULL,
    "accountName" TEXT NOT NULL,
    "status" "TargetStatus" NOT NULL DEFAULT 'PENDING',
    "remotePostId" TEXT,
    "remoteUrl" TEXT,
    "remoteContainerId" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "dedupeKey" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerHeartbeat" (
    "id" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkerHeartbeat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BioPage_userId_key" ON "BioPage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BioPage_slug_key" ON "BioPage"("slug");

-- CreateIndex
CREATE INDEX "BioLink_pageId_position_idx" ON "BioLink"("pageId", "position");

-- CreateIndex
CREATE INDEX "SocialAccount_userId_idx" ON "SocialAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_provider_providerAccountId_key" ON "SocialAccount"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramComment_igCommentId_key" ON "InstagramComment"("igCommentId");

-- CreateIndex
CREATE INDEX "InstagramComment_socialAccountId_status_commentedAt_idx" ON "InstagramComment"("socialAccountId", "status", "commentedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommentReply_remoteReplyId_key" ON "CommentReply"("remoteReplyId");

-- CreateIndex
CREATE INDEX "CommentReply_commentId_createdAt_idx" ON "CommentReply"("commentId", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsage_userId_createdAt_idx" ON "AiUsage"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_storageKey_key" ON "MediaAsset"("storageKey");

-- CreateIndex
CREATE INDEX "MediaAsset_userId_createdAt_idx" ON "MediaAsset"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Post_userId_createdAt_idx" ON "Post"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PostTarget_socialAccountId_idx" ON "PostTarget"("socialAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "PostTarget_postId_socialAccountId_key" ON "PostTarget"("postId", "socialAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_dedupeKey_key" ON "Job"("dedupeKey");

-- CreateIndex
CREATE INDEX "Job_status_runAt_idx" ON "Job"("status", "runAt");

-- AddForeignKey
ALTER TABLE "BioPage" ADD CONSTRAINT "BioPage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BioPage" ADD CONSTRAINT "BioPage_avatarMediaId_fkey" FOREIGN KEY ("avatarMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BioLink" ADD CONSTRAINT "BioLink_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "BioPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramComment" ADD CONSTRAINT "InstagramComment_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentReply" ADD CONSTRAINT "CommentReply_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "InstagramComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSettings" ADD CONSTRAINT "AiSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "InstagramComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostMedia" ADD CONSTRAINT "PostMedia_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostMedia" ADD CONSTRAINT "PostMedia_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTarget" ADD CONSTRAINT "PostTarget_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTarget" ADD CONSTRAINT "PostTarget_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
