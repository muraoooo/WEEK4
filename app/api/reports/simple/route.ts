import { NextRequest, NextResponse } from 'next/server';

// シンプルなモックデータを返すAPI
export async function GET(request: NextRequest) {
  try {
    // モックデータ
    const mockReports = [
      {
        _id: '1',
        targetId: 'post-001',
        targetType: 'post',
        reporterId: 'user-001',
        reporterName: '通報者1',
        reporterEmail: 'reporter1@example.com',
        reason: 'スパム',
        description: '不適切な広告が含まれています',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        _id: '2',
        targetId: 'post-002',
        targetType: 'post',
        reporterId: 'user-002',
        reporterName: '通報者2',
        reporterEmail: 'reporter2@example.com',
        reason: 'ハラスメント',
        description: '不適切な言葉遣いがあります',
        status: 'resolved',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        _id: '3',
        targetId: 'comment-001',
        targetType: 'comment',
        reporterId: 'user-003',
        reporterName: '通報者3',
        reporterEmail: 'reporter3@example.com',
        reason: '誤情報',
        description: 'コミュニティガイドラインに違反しています',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    return NextResponse.json({
      success: true,
      reports: mockReports
    });
    
  } catch (error) {
    console.error('Simple API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', reports: [] },
      { status: 500 }
    );
  }
}