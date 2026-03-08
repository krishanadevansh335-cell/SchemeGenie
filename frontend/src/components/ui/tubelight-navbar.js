import { useState } from "react";
import { cn } from "../../lib/utils";

export function NavBar({ items, className, children }) {
  const [activeTab, setActiveTab] = useState(items[0]?.name || "");
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div
      className={cn(
        "fixed top-4 left-[20%] flex items-center gap-6",
        "transform-gpu", // Hardware acceleration for better performance
        className,
      )}
      style={{
        zIndex: 99999, // Ensure navbar is always on top
        willChange: 'transform', // Optimize for animations
        backfaceVisibility: 'hidden', // Prevent flickering
        transform: 'translateZ(0)', // Force hardware acceleration
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Main Navigation */}
      <div
        className={cn(
          "relative flex items-center gap-2 backdrop-blur-lg py-2 px-3 rounded-full shadow-lg",
        )}
        style={{
          background: 'rgba(0, 0, 0, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.3)'
        }}>


        {/* Navigation Items */}
        {items.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeTab === item.name;

          return (
            <button
              key={item.name}
              type="button"
              onClick={() => {
                setActiveTab(item.name);
                if (item.onClick) item.onClick();
              }}
              className={cn(
                "relative cursor-pointer text-sm font-semibold px-3 py-1.5 rounded-full transition-all duration-300 flex items-center gap-1.5",
                "text-white hover:text-yellow-300 hover:bg-white/10",
                isActive && "bg-white/20 text-yellow-300",
              )}
              style={{
                background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                color: isActive ? '#fde047' : '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
            >
              <Icon size={16} strokeWidth={2.5} style={{ opacity: 0.9 }} />
              <span style={{ fontSize: '13px', fontWeight: 500 }}>{item.name}</span>
            </button>
          );
        })}

      </div>

      {/* Additional children (like notifications) */}
      {children}
    </div>
  );
}
