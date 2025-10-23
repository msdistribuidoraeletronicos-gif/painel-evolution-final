import React from "react";
import { Label } from "@/components/ui/label";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { HelpCircle } from "lucide-react";

export default function ConfigField({ label, description, children, required = false }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {description && (
          <HoverCard>
            <HoverCardTrigger>
              <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              <p className="text-sm text-gray-600">{description}</p>
            </HoverCardContent>
          </HoverCard>
        )}
      </div>
      {children}
    </div>
  );
}