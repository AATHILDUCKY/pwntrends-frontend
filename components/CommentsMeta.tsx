"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";

interface CommentsMetaProps {
  slug: string;
  commentsCount?: number;
  /**
   * Optional extra classes for layout/custom styling
   */
  className?: string;
  /**
   * If true, only the icon is shown (no text label).
   */
  iconOnly?: boolean;
}

export default function CommentsMeta({
  slug,
  commentsCount = 0,
  className = "",
  iconOnly = false,
}: CommentsMetaProps) {
  const label =
    commentsCount === 0
      ? "0 comments"
      : `${commentsCount} comment${commentsCount !== 1 ? "s" : ""}`;

  return (
    <Link
      href={`/post/${slug}`}
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] 
      text-slate-400 hover:text-slate-100 hover:bg-slate-900/70 border border-transparent 
      hover:border-slate-800 transition-colors ${className}`}
      aria-label={iconOnly ? label : undefined}
    >
      <MessageCircle className="w-3.5 h-3.5" />
      {!iconOnly && (
        <span className="whitespace-nowrap">
          {label}
        </span>
      )}
    </Link>
  );
}
