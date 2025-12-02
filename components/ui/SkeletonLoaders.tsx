import React from 'react';
import { cn } from './design-system';

/**
 * Base Skeleton Component
 * Used as building block for content-aware skeleton loaders
 */
export const Skeleton = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-zinc-200/60",
        className
      )}
      {...props}
    />
  );
};

/**
 * Shimmer Skeleton Component
 * Enhanced skeleton with shimmer animation for premium feel
 */
export const ShimmerSkeleton = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "rounded-md bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200",
        "bg-[length:200%_100%] animate-shimmer",
        className
      )}
      {...props}
    />
  );
};

/**
 * ProjectCardSkeleton
 * Mimics the project card structure with header, content, and footer
 */
export const ProjectCardSkeleton = () => {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-4">
      {/* Header with logo and title */}
      <div className="flex items-start gap-4">
        <ShimmerSkeleton className="h-14 w-14 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <ShimmerSkeleton className="h-5 w-3/4" />
          <ShimmerSkeleton className="h-4 w-1/2" />
        </div>
      </div>

      {/* Description lines */}
      <div className="space-y-2 pt-2">
        <ShimmerSkeleton className="h-4 w-full" />
        <ShimmerSkeleton className="h-4 w-5/6" />
      </div>

      {/* Footer with badges and metrics */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
        <div className="flex gap-2">
          <ShimmerSkeleton className="h-6 w-16 rounded-full" />
          <ShimmerSkeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex items-center gap-4">
          <ShimmerSkeleton className="h-4 w-12" />
          <ShimmerSkeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
};

/**
 * StatCardSkeleton
 * Mimics dashboard stat cards with icon, title, value, and trend
 */
export const StatCardSkeleton = ({
  delay = '0ms'
}: {
  delay?: string
}) => {
  return (
    <div
      className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6"
      style={{ animationDelay: delay }}
    >
      <div className="flex items-center justify-between space-y-0 pb-2">
        <ShimmerSkeleton className="h-4 w-24" />
        <ShimmerSkeleton className="h-10 w-10 rounded-full" />
      </div>
      <div className="flex flex-col gap-1 pt-4">
        <ShimmerSkeleton className="h-8 w-16" />
        <ShimmerSkeleton className="h-3 w-32" />
      </div>
    </div>
  );
};

/**
 * DetailPageHeaderSkeleton
 * Mimics project detail page header with breadcrumbs, title, and actions
 */
export const DetailPageHeaderSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2">
        <ShimmerSkeleton className="h-4 w-16" />
        <ShimmerSkeleton className="h-4 w-2" />
        <ShimmerSkeleton className="h-4 w-32" />
      </div>

      {/* Title and actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1">
          <ShimmerSkeleton className="h-16 w-16 rounded-xl flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <ShimmerSkeleton className="h-8 w-64" />
            <ShimmerSkeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="flex gap-2">
          <ShimmerSkeleton className="h-10 w-32 rounded-lg" />
          <ShimmerSkeleton className="h-10 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
};

/**
 * StatGridSkeleton
 * Mimics the stat cards grid on project detail page
 */
export const StatGridSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[0, 100, 200, 300].map((delay) => (
        <div
          key={delay}
          className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5"
          style={{ animationDelay: `${delay}ms` }}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <ShimmerSkeleton className="h-4 w-20" />
              <ShimmerSkeleton className="h-7 w-16" />
            </div>
            <ShimmerSkeleton className="h-12 w-12 rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * TabNavigationSkeleton
 * Mimics tab navigation with multiple tabs
 */
export const TabNavigationSkeleton = () => {
  return (
    <div className="border-b border-zinc-200">
      <div className="flex gap-6">
        {[80, 100, 90].map((width, i) => (
          <ShimmerSkeleton
            key={i}
            className="h-10 rounded-t-lg"
            style={{ width: `${width}px` }}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * TaskListSkeleton
 * Mimics a list of task items with checkbox and text
 */
export const TaskListSkeleton = ({
  count = 5
}: {
  count?: number
}) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-lg"
        >
          <ShimmerSkeleton className="h-5 w-5 rounded flex-shrink-0" />
          <ShimmerSkeleton
            className="h-4"
            style={{ width: `${60 + Math.random() * 30}%` }}
          />
        </div>
      ))}
    </div>
  );
};

/**
 * TableRowSkeleton
 * Mimics table rows with multiple columns
 */
export const TableRowSkeleton = ({
  columns = 4
}: {
  columns?: number
}) => {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-zinc-100">
      {Array.from({ length: columns }).map((_, i) => (
        <ShimmerSkeleton
          key={i}
          className="h-4"
          style={{
            width: i === 0 ? '30%' : i === columns - 1 ? '15%' : '20%'
          }}
        />
      ))}
    </div>
  );
};

/**
 * ActivityFeedSkeleton
 * Mimics activity feed items with avatar and text
 */
export const ActivityFeedSkeleton = ({
  count = 4
}: {
  count?: number
}) => {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-4">
          <ShimmerSkeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <ShimmerSkeleton className="h-4 w-3/4" />
            <ShimmerSkeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * ChartSkeleton
 * Mimics chart/graph placeholders
 */
export const ChartSkeleton = () => {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6">
      <div className="space-y-4">
        <ShimmerSkeleton className="h-6 w-48" />
        <div className="h-[300px] flex items-end gap-2">
          {[60, 80, 70, 90, 75, 85, 65].map((height, i) => (
            <ShimmerSkeleton
              key={i}
              className="flex-1 rounded-t-lg"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * VideoPlayerSkeleton
 * Mimics video player with controls
 */
export const VideoPlayerSkeleton = () => {
  return (
    <div className="bg-zinc-900 rounded-xl overflow-hidden">
      <ShimmerSkeleton className="w-full aspect-video bg-zinc-800" />
      <div className="p-4 bg-zinc-900 space-y-3">
        <ShimmerSkeleton className="h-2 w-full bg-zinc-700" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShimmerSkeleton className="h-8 w-8 rounded-full bg-zinc-700" />
            <ShimmerSkeleton className="h-8 w-8 rounded-full bg-zinc-700" />
            <ShimmerSkeleton className="h-4 w-24 bg-zinc-700" />
          </div>
          <ShimmerSkeleton className="h-8 w-8 rounded-full bg-zinc-700" />
        </div>
      </div>
    </div>
  );
};

/**
 * FormFieldSkeleton
 * Mimics form input fields with labels
 */
export const FormFieldSkeleton = ({
  count = 3
}: {
  count?: number
}) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <ShimmerSkeleton className="h-4 w-24" />
          <ShimmerSkeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
};

/**
 * CardGridSkeleton
 * Generic grid of cards for various use cases
 */
export const CardGridSkeleton = ({
  count = 6,
  columns = 3
}: {
  count?: number;
  columns?: 2 | 3 | 4;
}) => {
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <div className={cn('grid gap-6', gridCols[columns])}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 space-y-4">
          <ShimmerSkeleton className="h-6 w-3/4" />
          <div className="space-y-2">
            <ShimmerSkeleton className="h-4 w-full" />
            <ShimmerSkeleton className="h-4 w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );
};
