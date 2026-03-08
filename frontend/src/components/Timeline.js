import React from 'react';
import { CheckCircle, Download, Repeat, Send, Shapes } from 'lucide-react';

// Simple utility function for class names
function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function TimelineContainer({ children }) {
  return (
    <div className="mx-auto flex max-w-md flex-col justify-center gap-3">
      {children}
    </div>
  );
}

export function TimelineEvent({
  label,
  message,
  icon: Icon,
  isLast = false,
  isActive = false
}) {
  return (
    <div className="group relative -m-2 flex gap-4 p-2">
      <div className="relative">
        <div
          className={cn(
            "rounded-full border bg-background p-2",
            isActive ? "border-green-500" : "border-gray-200"
          )}
        >
          <Icon className={cn("h-4 w-4", isActive ? "text-green-500" : "text-gray-400")} />
        </div>
        {!isLast && (
          <div className="absolute inset-x-0 mx-auto h-full w-[2px] bg-gray-200" />
        )}
      </div>
      <div className="mt-1 flex flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-4">
          <p className={cn("text-sm font-medium", isActive ? "text-gray-900" : "text-gray-500")}>
            {label}
          </p>
        </div>
        <p className="text-xs text-gray-500">{message}</p>
      </div>
    </div>
  );
}

export function Timeline({ status = 'applied' }) {
  const statusOrder = ['applied', 'documents', 'verification', 'approval', 'completed'];
  const currentStatusIndex = statusOrder.indexOf(status) || 0;

  const steps = [
    {
      label: "Application Submitted",
      message: "Your application has been successfully submitted.",
      icon: Shapes,
      id: 'applied'
    },
    {
      label: "Documents Verification",
      message: "Verifying your submitted documents and details.",
      icon: Send,
      id: 'documents'
    },
    {
      label: "Field Verification",
      message: "Your details are being verified by our team.",
      icon: CheckCircle,
      id: 'verification'
    },
    {
      label: "Approval Process",
      message: "Your application is under final review.",
      icon: Repeat,
      id: 'approval'
    },
    {
      label: "Scheme Disbursement",
      message: "Scheme benefits will be processed upon approval.",
      icon: Download,
      id: 'completed'
    },
  ];

  return (
    <div className="w-full mt-2">
      <TimelineContainer>
        {steps.map((step, index) => (
          <TimelineEvent
            key={step.id}
            label={step.label}
            message={step.message}
            icon={step.icon}
            isLast={index === steps.length - 1}
            isActive={index <= currentStatusIndex}
          />
        ))}
      </TimelineContainer>
    </div>
  );
}

export default Timeline;
