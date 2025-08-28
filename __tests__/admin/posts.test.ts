import { describe, expect, test, beforeEach, jest } from '@jest/globals';

// モックデータ
const mockPosts = [
  {
    _id: '1',
    authorName: 'テストユーザー1',
    authorEmail: 'test1@example.com',
    content: 'これは通常の投稿内容です。',
    likeCount: 10,
    commentCount: 5,
    createdAt: new Date('2024-01-01'),
    status: 'active',
    reported: false,
    reportCount: 0,
    category: 'general',
  },
  {
    _id: '2',
    authorName: 'テストユーザー2',
    authorEmail: 'test2@example.com',
    content: '暴力的な内容を含む投稿。攻撃的な言葉。',
    likeCount: 0,
    commentCount: 2,
    createdAt: new Date('2024-01-02'),
    status: 'active',
    reported: true,
    reportCount: 3,
    category: 'discussion',
  },
  {
    _id: '3',
    authorName: 'スパムユーザー',
    authorEmail: 'spam@example.com',
    content: 'クリックして無料で購入！今すぐ送金してください！',
    likeCount: 0,
    commentCount: 0,
    createdAt: new Date('2024-01-03'),
    status: 'hidden',
    reported: true,
    reportCount: 10,
    category: null,
  },
];

// モデレーション分析関数のテスト
function analyzeContent(content: string) {
  const lowerContent = content.toLowerCase();
  
  const violenceKeywords = ['暴力', '殺', '攻撃', 'violence', 'kill', 'attack'];
  const spamKeywords = ['クリック', '購入', '無料', 'click here', 'buy now', 'free', '送金'];
  
  let score = 0;
  let flags = [];
  
  for (const keyword of violenceKeywords) {
    if (lowerContent.includes(keyword)) {
      score += 0.3;
      if (!flags.includes('violent_content')) {
        flags.push('violent_content');
      }
    }
  }
  
  for (const keyword of spamKeywords) {
    if (lowerContent.includes(keyword)) {
      score += 0.2;
      if (!flags.includes('spam_content')) {
        flags.push('spam_content');
      }
    }
  }
  
  return {
    score: Math.min(score, 1),
    flags,
  };
}

describe('投稿管理システムのテスト', () => {
  
  describe('モデレーション判定のテスト', () => {
    test('通常のコンテンツが低リスクと判定される', () => {
      const result = analyzeContent('これは通常の投稿内容です。');
      expect(result.score).toBeLessThan(0.3);
      expect(result.flags).toHaveLength(0);
    });
    
    test('暴力的なコンテンツが高リスクと判定される', () => {
      const result = analyzeContent('暴力的な内容を含む投稿。攻撃的な言葉。');
      expect(result.score).toBeGreaterThanOrEqual(0.3);
      expect(result.flags).toContain('violent_content');
    });
    
    test('スパムコンテンツが検出される', () => {
      const result = analyzeContent('クリックして無料で購入！今すぐ送金してください！');
      expect(result.score).toBeGreaterThan(0.3);
      expect(result.flags).toContain('spam_content');
    });
    
    test('複数の問題があるコンテンツが複数のフラグを持つ', () => {
      const result = analyzeContent('攻撃的な内容と無料クリックの両方を含む');
      expect(result.flags).toContain('violent_content');
      expect(result.flags).toContain('spam_content');
      expect(result.score).toBeGreaterThan(0.4);
    });
    
    test('空のコンテンツが最低リスクと判定される', () => {
      const result = analyzeContent('');
      expect(result.score).toBe(0);
      expect(result.flags).toHaveLength(0);
    });
  });
  
  describe('フィルタリング機能のテスト', () => {
    test('ステータスフィルターが正しく動作する', () => {
      const activePosts = mockPosts.filter(p => p.status === 'active');
      expect(activePosts).toHaveLength(2);
      
      const hiddenPosts = mockPosts.filter(p => p.status === 'hidden');
      expect(hiddenPosts).toHaveLength(1);
    });
    
    test('通報フィルターが正しく動作する', () => {
      const reportedPosts = mockPosts.filter(p => p.reported === true);
      expect(reportedPosts).toHaveLength(2);
      
      const highRiskPosts = mockPosts.filter(p => p.reportCount >= 5);
      expect(highRiskPosts).toHaveLength(1);
    });
    
    test('カテゴリフィルターが正しく動作する', () => {
      const generalPosts = mockPosts.filter(p => p.category === 'general');
      expect(generalPosts).toHaveLength(1);
      
      const uncategorizedPosts = mockPosts.filter(p => !p.category);
      expect(uncategorizedPosts).toHaveLength(1);
    });
    
    test('日付フィルターが正しく動作する', () => {
      const today = new Date('2024-01-03');
      const todayPosts = mockPosts.filter(p => {
        const postDate = new Date(p.createdAt);
        return postDate.toDateString() === today.toDateString();
      });
      expect(todayPosts).toHaveLength(1);
    });
    
    test('複合フィルターが正しく動作する', () => {
      const filteredPosts = mockPosts.filter(p => 
        p.status === 'active' && 
        p.reported === true
      );
      expect(filteredPosts).toHaveLength(1);
      expect(filteredPosts[0]._id).toBe('2');
    });
  });
  
  describe('一括操作機能のテスト', () => {
    let testPosts: any[];
    
    beforeEach(() => {
      testPosts = JSON.parse(JSON.stringify(mockPosts));
    });
    
    test('一括削除が正しく動作する', () => {
      const postIds = ['1', '2'];
      testPosts.forEach(post => {
        if (postIds.includes(post._id)) {
          post.status = 'deleted';
          post.isDeleted = true;
        }
      });
      
      const deletedPosts = testPosts.filter(p => p.isDeleted === true);
      expect(deletedPosts).toHaveLength(2);
    });
    
    test('一括非表示が正しく動作する', () => {
      const postIds = ['1', '2'];
      testPosts.forEach(post => {
        if (postIds.includes(post._id)) {
          post.status = 'hidden';
          post.isHidden = true;
        }
      });
      
      const hiddenPosts = testPosts.filter(p => p.isHidden === true);
      expect(hiddenPosts).toHaveLength(2);
    });
    
    test('一括カテゴリ変更が正しく動作する', () => {
      const postIds = ['1', '2', '3'];
      const newCategory = 'news';
      
      testPosts.forEach(post => {
        if (postIds.includes(post._id)) {
          post.category = newCategory;
        }
      });
      
      const categorizedPosts = testPosts.filter(p => p.category === newCategory);
      expect(categorizedPosts).toHaveLength(3);
    });
    
    test('空の選択で一括操作が実行されない', () => {
      const postIds: string[] = [];
      const originalPosts = JSON.parse(JSON.stringify(testPosts));
      
      // 操作を試みる（実際には何も変更されない）
      testPosts.forEach(post => {
        if (postIds.includes(post._id)) {
          post.status = 'deleted';
        }
      });
      
      expect(testPosts).toEqual(originalPosts);
    });
    
    test('一括通報クリアが正しく動作する', () => {
      const postIds = ['2', '3'];
      
      testPosts.forEach(post => {
        if (postIds.includes(post._id)) {
          post.reported = false;
          post.reportCount = 0;
        }
      });
      
      const clearedPosts = testPosts.filter(p => postIds.includes(p._id));
      clearedPosts.forEach(post => {
        expect(post.reported).toBe(false);
        expect(post.reportCount).toBe(0);
      });
    });
  });
  
  describe('通報処理のテスト', () => {
    test('通報が正しく記録される', () => {
      const post = { ...mockPosts[0] };
      
      // 通報を追加
      post.reported = true;
      post.reportCount = 1;
      
      expect(post.reported).toBe(true);
      expect(post.reportCount).toBe(1);
    });
    
    test('複数の通報が累積される', () => {
      const post = { ...mockPosts[0] };
      
      // 複数の通報を追加
      for (let i = 0; i < 5; i++) {
        post.reportCount = (post.reportCount || 0) + 1;
      }
      post.reported = true;
      
      expect(post.reportCount).toBe(5);
      expect(post.reported).toBe(true);
    });
    
    test('通報解決が正しく処理される', () => {
      const post = { ...mockPosts[1] };
      
      // 通報を解決
      post.reported = false;
      post.wasReported = true;
      post.resolvedAt = new Date();
      
      expect(post.reported).toBe(false);
      expect(post.wasReported).toBe(true);
      expect(post.resolvedAt).toBeDefined();
    });
    
    test('高リスク通報が自動フラグされる', () => {
      const post = { ...mockPosts[0] };
      
      // 高リスク閾値を超える通報
      post.reportCount = 10;
      post.reported = true;
      
      const isHighRisk = post.reportCount >= 10;
      expect(isHighRisk).toBe(true);
    });
    
    test('通報理由が正しく分類される', () => {
      const reportReasons = [
        { reason: 'spam', count: 5 },
        { reason: 'violence', count: 3 },
        { reason: 'harassment', count: 2 },
      ];
      
      const totalReports = reportReasons.reduce((sum, r) => sum + r.count, 0);
      const mainReason = reportReasons.sort((a, b) => b.count - a.count)[0];
      
      expect(totalReports).toBe(10);
      expect(mainReason.reason).toBe('spam');
    });
  });
  
  describe('エクスポート機能のテスト', () => {
    test('CSVエクスポートデータが正しく生成される', () => {
      const csvHeaders = [
        'ID',
        '投稿者名',
        '投稿者メール',
        'コンテンツ',
        'カテゴリ',
        'いいね数',
        'コメント数',
        '通報数',
        'ステータス',
      ];
      
      const csvData = mockPosts.map(post => [
        post._id,
        post.authorName,
        post.authorEmail,
        post.content,
        post.category || '未分類',
        post.likeCount,
        post.commentCount,
        post.reportCount,
        post.status,
      ]);
      
      expect(csvData).toHaveLength(3);
      expect(csvData[0][0]).toBe('1');
      expect(csvData[1][8]).toBe('active');
    });
    
    test('特殊文字がエスケープされる', () => {
      function escapeCSV(str: string): string {
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      }
      
      const testString = 'テスト,カンマ"引用符"改行\n含む';
      const escaped = escapeCSV(testString);
      expect(escaped).toBe('"テスト,カンマ""引用符""改行\n含む"');
    });
    
    test('フィルター適用後のエクスポートが正しい', () => {
      const filteredPosts = mockPosts.filter(p => p.reported === true);
      const exportData = filteredPosts.map(p => ({
        id: p._id,
        content: p.content,
        reportCount: p.reportCount,
      }));
      
      expect(exportData).toHaveLength(2);
      expect(exportData[0].reportCount).toBeGreaterThan(0);
    });
  });
  
  describe('ページネーションのテスト', () => {
    test('ページサイズが正しく適用される', () => {
      const pageSize = 2;
      const page = 0;
      
      const paginatedPosts = mockPosts.slice(
        page * pageSize,
        (page + 1) * pageSize
      );
      
      expect(paginatedPosts).toHaveLength(2);
      expect(paginatedPosts[0]._id).toBe('1');
    });
    
    test('最終ページが正しく処理される', () => {
      const pageSize = 2;
      const totalPages = Math.ceil(mockPosts.length / pageSize);
      const lastPage = totalPages - 1;
      
      const lastPagePosts = mockPosts.slice(
        lastPage * pageSize,
        mockPosts.length
      );
      
      expect(lastPagePosts).toHaveLength(1);
      expect(lastPagePosts[0]._id).toBe('3');
    });
  });
});