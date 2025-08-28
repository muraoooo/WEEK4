import { NextRequest, NextResponse } from 'next/server';
import connectDatabase from '@/lib/database';
import mongoose from 'mongoose';

// AIモデレーション分析を実行する関数（実際のAI APIの代わりにルールベースの分析を実装）
function analyzeContent(content: string): {
  score: number;
  flags: string[];
  recommendations: string[];
  confidence: number;
  categories: {
    violence: number;
    harassment: number;
    hate: number;
    spam: number;
    adult: number;
    fraud: number;
  };
  summary: string;
} {
  const lowerContent = content.toLowerCase();
  
  // 禁止語句のリスト（実際の実装ではもっと洗練されたものを使用）
  const violenceKeywords = ['暴力', '殺', '攻撃', 'violence', 'kill', 'attack'];
  const harassmentKeywords = ['バカ', 'アホ', '死ね', 'stupid', 'idiot', 'die'];
  const hateKeywords = ['差別', '憎', 'hate', 'discrimination'];
  const spamKeywords = ['クリック', '購入', '無料', 'click here', 'buy now', 'free'];
  const adultKeywords = ['アダルト', 'セックス', 'adult', 'sex', 'porn'];
  const fraudKeywords = ['詐欺', '送金', 'scam', 'transfer money'];
  
  // カテゴリースコアを計算
  const categories = {
    violence: calculateScore(lowerContent, violenceKeywords),
    harassment: calculateScore(lowerContent, harassmentKeywords),
    hate: calculateScore(lowerContent, hateKeywords),
    spam: calculateScore(lowerContent, spamKeywords),
    adult: calculateScore(lowerContent, adultKeywords),
    fraud: calculateScore(lowerContent, fraudKeywords),
  };
  
  // フラグを設定
  const flags: string[] = [];
  if (categories.violence > 0.3) flags.push('violent_content');
  if (categories.harassment > 0.3) flags.push('potential_harassment');
  if (categories.hate > 0.3) flags.push('hate_speech');
  if (categories.spam > 0.3) flags.push('spam_content');
  if (categories.adult > 0.3) flags.push('inappropriate_content');
  if (categories.fraud > 0.3) flags.push('potential_fraud');
  
  // 大文字の使用率をチェック
  const uppercaseRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (uppercaseRatio > 0.5) flags.push('excessive_caps');
  
  // 感嘆符の使用をチェック
  const exclamationCount = (content.match(/!/g) || []).length;
  if (exclamationCount > 5) flags.push('excessive_punctuation');
  
  // URLの存在をチェック
  const urlPattern = /https?:\/\/[^\s]+/gi;
  const hasUrls = urlPattern.test(content);
  if (hasUrls && categories.spam > 0.2) flags.push('suspicious_links');
  
  // 総合スコアを計算
  const maxScore = Math.max(...Object.values(categories));
  const avgScore = Object.values(categories).reduce((a, b) => a + b, 0) / Object.keys(categories).length;
  const score = maxScore * 0.7 + avgScore * 0.3;
  
  // 推奨アクション
  const recommendations: string[] = [];
  if (score > 0.8) {
    recommendations.push('この投稿を即座に削除することを推奨します');
    recommendations.push('投稿者に警告を送信することを検討してください');
  } else if (score > 0.6) {
    recommendations.push('この投稿を非表示にすることを推奨します');
    recommendations.push('手動で詳細レビューを実施してください');
  } else if (score > 0.4) {
    recommendations.push('この投稿を監視リストに追加することを推奨します');
    recommendations.push('コンテンツガイドラインの再確認を投稿者に促してください');
  } else {
    recommendations.push('現時点で特別な対応は不要です');
    recommendations.push('定期的な監視を継続してください');
  }
  
  // サマリーを生成
  let summary = '';
  if (score > 0.7) {
    summary = 'この投稿は高リスクと判定されました。';
  } else if (score > 0.4) {
    summary = 'この投稿は中程度のリスクがあります。';
  } else {
    summary = 'この投稿は低リスクと判定されました。';
  }
  
  const mainIssues = Object.entries(categories)
    .filter(([_, score]) => score > 0.3)
    .map(([category, _]) => category);
  
  if (mainIssues.length > 0) {
    summary += ` 主な懸念事項: ${mainIssues.join(', ')}。`;
  }
  
  return {
    score,
    flags,
    recommendations,
    confidence: 0.85, // 固定値（実際のAI実装では動的に計算）
    categories,
    summary,
  };
}

// キーワードスコアを計算する補助関数
function calculateScore(content: string, keywords: string[]): number {
  let count = 0;
  for (const keyword of keywords) {
    const regex = new RegExp(keyword, 'gi');
    const matches = content.match(regex);
    if (matches) {
      count += matches.length;
    }
  }
  
  // コンテンツの長さに対する相対的なスコアを返す
  const words = content.split(/\s+/).length;
  const score = Math.min(count / Math.max(words * 0.1, 1), 1);
  return score;
}

export async function POST(request: NextRequest) {
  try {
    await connectDatabase();
    
    const body = await request.json();
    const { postId, content } = body;
    
    if (!postId && !content) {
      return NextResponse.json(
        { error: 'Post ID or content is required' },
        { status: 400 }
      );
    }
    
    let postContent = content;
    
    // postIdが提供された場合、投稿内容を取得
    if (postId && !content) {
      const postsCollection = mongoose.connection.collection('posts');
      const post = await postsCollection.findOne({ 
        _id: new mongoose.Types.ObjectId(postId) 
      });
      
      if (!post) {
        return NextResponse.json(
          { error: 'Post not found' },
          { status: 404 }
        );
      }
      
      postContent = post.content || '';
    }
    
    // AI分析を実行
    const moderationResult = analyzeContent(postContent);
    
    // モデレーション結果をデータベースに保存
    if (postId) {
      const moderationLogsCollection = mongoose.connection.collection('moderation_logs');
      await moderationLogsCollection.insertOne({
        postId,
        score: moderationResult.score,
        flags: moderationResult.flags,
        categories: moderationResult.categories,
        recommendations: moderationResult.recommendations,
        confidence: moderationResult.confidence,
        summary: moderationResult.summary,
        timestamp: new Date(),
        reviewedBy: 'ai_system',
      });
      
      // 投稿のモデレーションスコアを更新
      const postsCollection = mongoose.connection.collection('posts');
      await postsCollection.updateOne(
        { _id: new mongoose.Types.ObjectId(postId) },
        { 
          $set: {
            aiModerationScore: moderationResult.score,
            aiModerationFlags: moderationResult.flags,
            lastModerated: new Date(),
          }
        }
      );
      
      // 高リスクの投稿を自動的に非表示にする
      if (moderationResult.score > 0.8) {
        await postsCollection.updateOne(
          { _id: new mongoose.Types.ObjectId(postId) },
          { 
            $set: {
              isHidden: true,
              hiddenAt: new Date(),
              hiddenReason: 'ai_moderation',
            }
          }
        );
      }
    }
    
    return NextResponse.json({
      success: true,
      moderation: moderationResult,
    });
  } catch (error) {
    console.error('Moderation API error:', error);
    return NextResponse.json(
      { error: 'Failed to perform moderation' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDatabase();
    
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    
    if (!postId) {
      // モデレーションログ一覧を取得
      const moderationLogsCollection = mongoose.connection.collection('moderation_logs');
      const logs = await moderationLogsCollection
        .find({})
        .sort({ timestamp: -1 })
        .limit(100)
        .toArray();
      
      return NextResponse.json({
        logs,
        total: logs.length,
      });
    }
    
    // 特定の投稿のモデレーション履歴を取得
    const moderationLogsCollection = mongoose.connection.collection('moderation_logs');
    const logs = await moderationLogsCollection
      .find({ postId })
      .sort({ timestamp: -1 })
      .toArray();
    
    return NextResponse.json({
      postId,
      logs,
      total: logs.length,
    });
  } catch (error) {
    console.error('Moderation GET API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch moderation logs' },
      { status: 500 }
    );
  }
}