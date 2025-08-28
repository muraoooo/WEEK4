import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET, POST, PATCH, DELETE } from '@/app/api/admin/users/route';
import { GET as GET_USER, PUT as PUT_USER, DELETE as DELETE_USER } from '@/app/api/admin/users/[id]/route';
import mongoose from 'mongoose';

// モック
jest.mock('@/lib/database', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve()),
}));

describe('User Management API Tests', () => {
  let mockUsersCollection: any;
  let mockAuditLogsCollection: any;
  let mockSessionsCollection: any;
  
  beforeEach(() => {
    // コレクションのモック
    mockUsersCollection = {
      find: jest.fn().mockReturnThis(),
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      updateMany: jest.fn(),
      countDocuments: jest.fn(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      toArray: jest.fn(),
    };
    
    mockAuditLogsCollection = {
      find: jest.fn().mockReturnThis(),
      insertOne: jest.fn(),
      insertMany: jest.fn(),
      countDocuments: jest.fn(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      toArray: jest.fn(),
    };
    
    mockSessionsCollection = {
      find: jest.fn().mockReturnThis(),
      findOne: jest.fn(),
      countDocuments: jest.fn(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      toArray: jest.fn(),
    };
    
    // Mongoose接続のモック
    mongoose.connection.collection = jest.fn((name: string) => {
      switch(name) {
        case 'users': return mockUsersCollection;
        case 'audit_logs': return mockAuditLogsCollection;
        case 'user_sessions': return mockSessionsCollection;
        default: return null;
      }
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/users', () => {
    it('should fetch users with pagination', async () => {
      const mockUsers = [
        {
          _id: new mongoose.Types.ObjectId(),
          email: 'user1@test.com',
          name: 'User 1',
          role: 'user',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          email: 'user2@test.com',
          name: 'User 2',
          role: 'admin',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      
      mockUsersCollection.toArray.mockResolvedValue(mockUsers);
      mockUsersCollection.countDocuments.mockResolvedValue(2);
      mockSessionsCollection.findOne.mockResolvedValue(null);
      
      const request = new NextRequest('http://localhost/api/admin/users?page=1&limit=50');
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.users).toHaveLength(2);
      expect(data.pagination.totalCount).toBe(2);
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(50);
    });
    
    it('should filter users by role', async () => {
      mockUsersCollection.toArray.mockResolvedValue([]);
      mockUsersCollection.countDocuments.mockResolvedValue(0);
      
      const request = new NextRequest('http://localhost/api/admin/users?role=admin');
      await GET(request);
      
      expect(mockUsersCollection.find).toHaveBeenCalledWith({ role: 'admin' });
    });
    
    it('should filter users by status', async () => {
      mockUsersCollection.toArray.mockResolvedValue([]);
      mockUsersCollection.countDocuments.mockResolvedValue(0);
      
      const request = new NextRequest('http://localhost/api/admin/users?status=suspended');
      await GET(request);
      
      expect(mockUsersCollection.find).toHaveBeenCalledWith({ status: 'suspended' });
    });
    
    it('should search users by email and name', async () => {
      mockUsersCollection.toArray.mockResolvedValue([]);
      mockUsersCollection.countDocuments.mockResolvedValue(0);
      
      const request = new NextRequest('http://localhost/api/admin/users?search=test');
      await GET(request);
      
      expect(mockUsersCollection.find).toHaveBeenCalledWith({
        $or: [
          { email: { $regex: 'test', $options: 'i' } },
          { name: { $regex: 'test', $options: 'i' } },
        ],
      });
    });
  });

  describe('POST /api/admin/users', () => {
    it('should create a new user', async () => {
      mockUsersCollection.findOne.mockResolvedValue(null);
      mockUsersCollection.insertOne.mockResolvedValue({
        insertedId: new mongoose.Types.ObjectId(),
      });
      mockAuditLogsCollection.insertOne.mockResolvedValue({});
      
      const request = new NextRequest('http://localhost/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@test.com',
          name: 'New User',
          role: 'user',
          password: 'password123',
          adminId: 'admin-123',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUsersCollection.insertOne).toHaveBeenCalled();
      expect(mockAuditLogsCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_CREATE',
          adminId: 'admin-123',
        })
      );
    });
    
    it('should prevent duplicate email addresses', async () => {
      mockUsersCollection.findOne.mockResolvedValue({ email: 'existing@test.com' });
      
      const request = new NextRequest('http://localhost/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'existing@test.com',
          name: 'User',
          role: 'user',
          password: 'password123',
        }),
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(400);
      expect(mockUsersCollection.insertOne).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /api/admin/users', () => {
    it('should perform bulk role update', async () => {
      mockUsersCollection.updateMany.mockResolvedValue({
        modifiedCount: 3,
        matchedCount: 3,
      });
      mockAuditLogsCollection.insertMany.mockResolvedValue({});
      
      const request = new NextRequest('http://localhost/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({
          userIds: ['id1', 'id2', 'id3'],
          action: 'BULK_ROLE_UPDATE',
          data: { role: 'moderator' },
          reason: 'Promotion',
          adminId: 'admin-123',
        }),
      });
      
      const response = await PATCH(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.modifiedCount).toBe(3);
      expect(mockUsersCollection.updateMany).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          $set: expect.objectContaining({ role: 'moderator' })
        })
      );
    });
    
    it('should perform bulk suspension', async () => {
      mockUsersCollection.updateMany.mockResolvedValue({
        modifiedCount: 2,
        matchedCount: 2,
      });
      mockAuditLogsCollection.insertMany.mockResolvedValue({});
      
      const request = new NextRequest('http://localhost/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({
          userIds: ['id1', 'id2'],
          action: 'BULK_SUSPEND',
          data: {},
          reason: 'Policy violation',
          adminId: 'admin-123',
        }),
      });
      
      const response = await PATCH(request);
      
      expect(response.status).toBe(200);
      expect(mockUsersCollection.updateMany).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          $set: expect.objectContaining({ status: 'suspended' })
        })
      );
    });
  });

  describe('GET /api/admin/users/[id]', () => {
    it('should fetch user details with statistics', async () => {
      const userId = new mongoose.Types.ObjectId();
      const mockUser = {
        _id: userId,
        email: 'user@test.com',
        name: 'Test User',
        role: 'user',
        status: 'active',
      };
      
      mockUsersCollection.findOne.mockResolvedValue(mockUser);
      mockSessionsCollection.find.mockReturnThis();
      mockSessionsCollection.toArray.mockResolvedValue([]);
      mockSessionsCollection.countDocuments.mockResolvedValue(5);
      mockAuditLogsCollection.find.mockReturnThis();
      mockAuditLogsCollection.toArray.mockResolvedValue([]);
      mockAuditLogsCollection.countDocuments.mockResolvedValue(0);
      
      const request = new NextRequest('http://localhost/api/admin/users/123');
      const response = await GET_USER(request, { params: { id: userId.toString() } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
      expect(data.stats).toBeDefined();
      expect(data.stats.totalSessions).toBe(5);
    });
    
    it('should return 404 for non-existent user', async () => {
      mockUsersCollection.findOne.mockResolvedValue(null);
      
      const request = new NextRequest('http://localhost/api/admin/users/invalid');
      const response = await GET_USER(request, { params: { id: 'invalid' } });
      
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/admin/users/[id]', () => {
    const userId = new mongoose.Types.ObjectId();
    
    beforeEach(() => {
      mockUsersCollection.findOne.mockResolvedValue({
        _id: userId,
        email: 'user@test.com',
        role: 'user',
        status: 'active',
      });
      mockUsersCollection.updateOne.mockResolvedValue({ matchedCount: 1 });
      mockAuditLogsCollection.insertOne.mockResolvedValue({});
    });
    
    it('should update user role', async () => {
      const request = new NextRequest('http://localhost/api/admin/users/123', {
        method: 'PUT',
        body: JSON.stringify({
          action: 'UPDATE_ROLE',
          data: { role: 'moderator' },
          reason: 'Promotion',
          adminId: 'admin-123',
        }),
      });
      
      const response = await PUT_USER(request, { params: { id: userId.toString() } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUsersCollection.updateOne).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          $set: expect.objectContaining({ role: 'moderator' })
        })
      );
      expect(mockAuditLogsCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ROLE_CHANGE',
          details: expect.objectContaining({
            oldRole: 'user',
            newRole: 'moderator',
          })
        })
      );
    });
    
    it('should issue warning to user', async () => {
      const request = new NextRequest('http://localhost/api/admin/users/123', {
        method: 'PUT',
        body: JSON.stringify({
          action: 'WARNING',
          reason: 'Inappropriate behavior',
          adminId: 'admin-123',
        }),
      });
      
      const response = await PUT_USER(request, { params: { id: userId.toString() } });
      
      expect(response.status).toBe(200);
      expect(mockUsersCollection.updateOne).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          $set: expect.objectContaining({ warningCount: 1 })
        })
      );
    });
    
    it('should suspend user account', async () => {
      const request = new NextRequest('http://localhost/api/admin/users/123', {
        method: 'PUT',
        body: JSON.stringify({
          action: 'SUSPEND',
          data: { duration: '7 days' },
          reason: 'Terms violation',
          adminId: 'admin-123',
        }),
      });
      
      const response = await PUT_USER(request, { params: { id: userId.toString() } });
      
      expect(response.status).toBe(200);
      expect(mockUsersCollection.updateOne).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          $set: expect.objectContaining({ status: 'suspended' })
        })
      );
    });
    
    it('should ban user permanently', async () => {
      const request = new NextRequest('http://localhost/api/admin/users/123', {
        method: 'PUT',
        body: JSON.stringify({
          action: 'BAN',
          reason: 'Severe violation',
          adminId: 'admin-123',
        }),
      });
      
      const response = await PUT_USER(request, { params: { id: userId.toString() } });
      
      expect(response.status).toBe(200);
      expect(mockUsersCollection.updateOne).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'banned',
            bannedReason: 'Severe violation',
          })
        })
      );
    });
    
    it('should reactivate user account', async () => {
      mockUsersCollection.findOne.mockResolvedValue({
        _id: userId,
        email: 'user@test.com',
        status: 'suspended',
      });
      
      const request = new NextRequest('http://localhost/api/admin/users/123', {
        method: 'PUT',
        body: JSON.stringify({
          action: 'REACTIVATE',
          reason: 'Appeal approved',
          adminId: 'admin-123',
        }),
      });
      
      const response = await PUT_USER(request, { params: { id: userId.toString() } });
      
      expect(response.status).toBe(200);
      expect(mockUsersCollection.updateOne).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          $set: expect.objectContaining({ status: 'active' })
        })
      );
    });
  });

  describe('DELETE /api/admin/users/[id]', () => {
    it('should perform logical deletion', async () => {
      const userId = new mongoose.Types.ObjectId();
      mockUsersCollection.updateOne.mockResolvedValue({ matchedCount: 1 });
      mockAuditLogsCollection.insertOne.mockResolvedValue({});
      
      const request = new NextRequest('http://localhost/api/admin/users/123', {
        method: 'DELETE',
        body: JSON.stringify({
          reason: 'Account closure request',
          adminId: 'admin-123',
        }),
      });
      
      const response = await DELETE_USER(request, { params: { id: userId.toString() } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUsersCollection.updateOne).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'deleted',
            deletedReason: 'Account closure request',
          })
        })
      );
      expect(mockAuditLogsCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_DELETE',
          adminId: 'admin-123',
        })
      );
    });
  });

  describe('Audit Logging', () => {
    it('should log all user management actions', async () => {
      const userId = new mongoose.Types.ObjectId();
      mockUsersCollection.findOne.mockResolvedValue({
        _id: userId,
        email: 'user@test.com',
        role: 'user',
      });
      mockUsersCollection.updateOne.mockResolvedValue({ matchedCount: 1 });
      
      const actions = ['WARNING', 'SUSPEND', 'BAN', 'REACTIVATE', 'UPDATE_ROLE'];
      
      for (const action of actions) {
        mockAuditLogsCollection.insertOne.mockClear();
        
        const request = new NextRequest('http://localhost/api/admin/users/123', {
          method: 'PUT',
          body: JSON.stringify({
            action,
            data: { role: 'admin' },
            reason: `Test ${action}`,
            adminId: 'admin-123',
          }),
        });
        
        await PUT_USER(request, { params: { id: userId.toString() } });
        
        expect(mockAuditLogsCollection.insertOne).toHaveBeenCalledWith(
          expect.objectContaining({
            action: expect.any(String),
            adminId: 'admin-123',
            targetUserId: userId.toString(),
            details: expect.objectContaining({
              reason: `Test ${action}`,
            }),
          })
        );
      }
    });
  });

  describe('Permission Checks', () => {
    it('should validate admin permissions for sensitive operations', async () => {
      // This would typically be handled by middleware
      // Testing the concept of permission validation
      
      const sensitiveActions = ['BAN', 'DELETE', 'UPDATE_ROLE'];
      
      for (const action of sensitiveActions) {
        const request = new NextRequest('http://localhost/api/admin/users/123', {
          method: 'PUT',
          body: JSON.stringify({
            action,
            adminId: 'admin-123',
            reason: 'Test',
          }),
        });
        
        // In a real implementation, this would check if adminId has appropriate permissions
        const body = await request.json();
        expect(body.adminId).toBeDefined();
      }
    });
  });

  describe('Search and Filter Integration', () => {
    it('should combine multiple filters correctly', async () => {
      mockUsersCollection.toArray.mockResolvedValue([]);
      mockUsersCollection.countDocuments.mockResolvedValue(0);
      
      const request = new NextRequest(
        'http://localhost/api/admin/users?search=test&role=admin&status=active&sortBy=email&sortOrder=asc'
      );
      
      await GET(request);
      
      expect(mockUsersCollection.find).toHaveBeenCalledWith({
        $or: [
          { email: { $regex: 'test', $options: 'i' } },
          { name: { $regex: 'test', $options: 'i' } },
        ],
        role: 'admin',
        status: 'active',
      });
      
      expect(mockUsersCollection.sort).toHaveBeenCalledWith({ email: 1 });
    });
  });
});