IF DB_ID('AnnamBrahma') IS NULL
    CREATE DATABASE AnnamBrahma;
GO
USE AnnamBrahma;
GO

IF OBJECT_ID('dbo.Users','U') IS NULL
CREATE TABLE dbo.Users (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    Login       NVARCHAR(50)  NOT NULL UNIQUE,
    Password    NVARCHAR(255) NOT NULL,
    Fullname    NVARCHAR(100) NOT NULL,
    Email       NVARCHAR(150) NULL,
    Phone       NVARCHAR(30)  NULL,
    Role        NVARCHAR(10)  NOT NULL DEFAULT 'user' CHECK (Role IN ('user','admin')),
    CreatedAt   DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID('dbo.Sessions','U') IS NULL
CREATE TABLE dbo.Sessions (
    Token       NVARCHAR(100) PRIMARY KEY,
    UserId      INT           NOT NULL REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    ExpiresAt   BIGINT        NOT NULL,
    CreatedAt   DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID('dbo.Audit','U') IS NULL
CREATE TABLE dbo.Audit (
    Id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    UserId      INT           NULL,
    Action      NVARCHAR(100) NOT NULL,
    Details     NVARCHAR(400) NULL,
    At          DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID('dbo.Messages','U') IS NULL
CREATE TABLE dbo.Messages (
    Id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    FromUserId  INT           NOT NULL REFERENCES dbo.Users(Id),
    ToUserId    INT           NULL     REFERENCES dbo.Users(Id),
    Text        NVARCHAR(MAX) NOT NULL,
    IsRead      BIT           NOT NULL DEFAULT 0,
    At          DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID('dbo.Settings','U') IS NULL
CREATE TABLE dbo.Settings (
    [Key]   NVARCHAR(100) PRIMARY KEY,
    [Value] NVARCHAR(500) NOT NULL
);
GO

IF OBJECT_ID('dbo.Bookings','U') IS NULL
CREATE TABLE dbo.Bookings (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    [Date]      NVARCHAR(20)  NOT NULL,
    [Name]      NVARCHAR(100) NOT NULL,
    Guests      INT           NOT NULL,
    [Time]      NVARCHAR(10)  NOT NULL,
    Email       NVARCHAR(150) NULL,
    Phone       NVARCHAR(30)  NULL,
    CreatedAt   DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Users)
BEGIN
    INSERT INTO dbo.Users (Login, Password, Fullname, Email, Role)
    VALUES ('admin', 'PLACEHOLDER', 'Администратор', 'admin@annambrahma.ru', 'admin'),
           ('user',  'PLACEHOLDER', 'Гость Ресторана', 'user@annambrahma.ru', 'user');
END

IF NOT EXISTS (SELECT 1 FROM dbo.Settings)
BEGIN
    INSERT INTO dbo.Settings ([Key],[Value]) VALUES
        ('restaurant_name','Annam Brahma'),
        ('contact_phone','+7 (3532) 12-34-56');
END
GO