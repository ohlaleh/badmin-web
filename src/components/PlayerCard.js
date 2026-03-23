"use client"

import Image from "next/image"
import React from "react"

/**
 * ฟังก์ชันดึงค่าระดับฝีมือ (Level) และกำหนดสีที่เหมาะสม
 */
function getLevelStyle(player) {
  const level = (player && typeof player.level === 'string') ? player.level : 'N-';
  
  const styles = {
    'P': { 
      bg: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
      dot: 'bg-yellow-500', 
      label: 'โปร' 
    },
    'S': { 
      bg: 'bg-purple-100 text-purple-800 border-purple-200', 
      dot: 'bg-purple-500', 
      label: 'เซมิ' 
    },
    'N': { 
      bg: 'bg-blue-100 text-blue-800 border-blue-200', 
      dot: 'bg-blue-500', 
      label: 'ปกติ' 
    },
    'N-': { 
      bg: 'bg-orange-100 text-orange-800 border-orange-200', 
      dot: 'bg-orange-500', 
      label: 'เริ่ม' 
    }
  };

  return styles[level] || styles['N-'];
}

export function detectStatus(player) {
  const s = (player && (player.status || player.state || "")).toString().toLowerCase();

  // P = Playing (อยู่ในคอร์ท)
  if (s.includes("p") || s.includes("playing") || player?.playing || player?.on_court) {
    return { code: 'P', bg: 'bg-emerald-500', text: 'text-white', title: 'กำลังแข่ง' };
  }

  // Q = No Next Match (ไม่มีแมตช์ถัดไป/หยุดเล่น)
  if (s.includes("no") || player?.play_status === 'stopped') {
    return { code: 'Q', bg: 'bg-gray-200', text: 'text-gray-500', title: 'พัก/หยุดเล่น' };
  }

  // R = Ready/Queued (รอในคิว)
  return { code: 'R', bg: 'bg-amber-400', text: 'text-white', title: 'รอลงสนาม' };
}

export default function PlayerCard({ player, showStatus = false, size = "md" }) {
  const levelStyle = getLevelStyle(player);
  const status = detectStatus(player);
  
  // กำหนดขนาดของ Component
  const sizeClasses = size === "sm" ? "h-6 w-6" : "h-8 w-8";

  return (
    <div className="flex items-center gap-2 group transition-all">
      {/* Avatar Circle */}
      <div className={`relative inline-flex items-center justify-center ${sizeClasses} rounded-full ${levelStyle.dot} shadow-sm shrink-0 border-2 border-white`}>
        {player?.avatar ? (
          <Image src={player.avatar} alt="avatar" width={32} height={32} className="rounded-full object-cover" />
        ) : (
          <Image 
            src={`/avatars/${String(player?.gender || "male").toLowerCase() === "female" ? "female" : "male"}.svg`} 
            alt="gender" 
            width={size === "sm" ? 14 : 20} 
            height={size === "sm" ? 14 : 20} 
          />
        )}
        
        {/* Status Mini-Dot (Optional: small dot on avatar) */}
        {showStatus && (
          <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${status.bg}`}></span>
        )}
      </div>

      {/* Name and Info */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className={`text-[11px] sm:text-xs px-2 py-0.5 rounded-md font-bold border ${levelStyle.bg} truncate max-w-[80px] sm:max-w-[100px]`}>
            {player?.name || "—"}
          </span>
          
          {/* Matches Badge */}
          {typeof player?.matches === 'number' && (
            <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1 rounded border border-gray-100">
              {player.matches} นัด
            </span>
          )}

          {/* Explicit Status Code Badge (if showStatus is true) */}
          {showStatus && !size === "sm" && (
            <div title={status.title} className={`text-[9px] px-1 py-0.5 rounded font-black ${status.bg} ${status.text} min-w-[14px] text-center shadow-sm`}>
              {status.code}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}