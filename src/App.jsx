import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar as CalendarIcon, List, Trophy, ChevronLeft, ChevronRight, 
  Monitor, MapPin, X, CheckCircle, AlertCircle, Info, Edit3, 
  Trash2, Plus, Save, Clock, GripHorizontal, Download, Upload, Timer, History,
  CloudDownload, Target, Smartphone, Crosshair, Clipboard, FileJson, Filter, ExternalLink, RefreshCw, Eye, EyeOff
} from 'lucide-react';

// --- INITIAL DATA ---
const INITIAL_EVENTS = [
  // --- VALORANT (Dữ liệu mẫu, sẽ được API cập nhật đè lên) ---
  { id: 'val-gf', game: 'valorant', tournament: 'Game Changers 2025', stage: 'Grand Final', team1: 'Team Liquid Brazil', team2: 'TBD', score1: null, score2: null, time: '2025-11-30T15:00:00+07:00', status: 'upcoming' },

  // --- PUBG PGC 2025 ---
  { id: 'pgc-gsa-m1', game: 'pubg', tournament: 'PGC 2025', stage: 'Group A - Match 1', team1: 'FN Pocheon', score1: 10, details: { map: 'Miramar', kills: 10, totalPoints: 20 }, time: '2025-11-28T17:00:00+07:00', status: 'completed', type: 'battle_royale' },
  { id: 'pgc-gsa-m2', game: 'pubg', tournament: 'PGC 2025', stage: 'Group A - Match 2', team1: 'Four Angry Men', score1: 10, details: { map: 'Miramar', kills: 6, totalPoints: 16 }, time: '2025-11-28T17:45:00+07:00', status: 'completed', type: 'battle_royale' },
  { id: 'pgc-gsa-m3', game: 'pubg', tournament: 'PGC 2025', stage: 'Group A - Match 3', team1: 'The Expendables', score1: 10, details: { map: 'Taego', kills: 5, totalPoints: 15 }, time: '2025-11-28T18:30:00+07:00', status: 'completed', type: 'battle_royale' },
  
  // --- AoV AIC 2025 ---
  { id: 'aic-ub-qf1', game: 'aov', tournament: 'AIC 2025', stage: 'Upper QF', team1: 'FULL SENSE', team2: 'HKA', score1: 3, score2: 0, time: '2025-11-28T14:00:00+07:00', status: 'completed' },
  { id: 'aic-ub-qf2', game: 'aov', tournament: 'AIC 2025', stage: 'Upper QF', team1: 'PSG', team2: 'FL', score1: 2, score2: 3, time: '2025-11-28T16:00:00+07:00', status: 'completed' },
];

const GAMES = {
  all: { label: 'Tất cả', color: 'bg-gray-700', text: 'text-gray-100', icon: Trophy },
  aov: { label: 'Liên Quân (AoV)', color: 'bg-yellow-600', text: 'text-yellow-100', icon: Smartphone }, 
  pubg: { label: 'PUBG PC', color: 'bg-orange-600', text: 'text-orange-100', icon: Crosshair },
  lol: { label: 'LMHT (LoL)', color: 'bg-blue-600', text: 'text-blue-100', icon: Monitor },
  valorant: { label: 'Valorant', color: 'bg-red-600', text: 'text-red-100', icon: Crosshair },
};

// --- HELPER: DATE FORMATTING ---
const formatDateForInput = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    const pad = (num) => num.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// --- HELPER: STATUS LOGIC ---
const getComputedStatus = (event, allEvents) => {
    if (event.status === 'completed') return 'completed';
    if (event.status === 'live') return 'live';

    const now = new Date();
    const eventTime = new Date(event.time);
    
    if (eventTime > now) return 'upcoming';

    // Logic xác định Live giả lập nếu không có API realtime
    const sameDayEvents = allEvents.filter(e => 
        e.game === event.game && 
        new Date(e.time).toDateString() === eventTime.toDateString()
    ).sort((a,b) => new Date(a.time) - new Date(b.time));

    const index = sameDayEvents.findIndex(e => e.id === event.id);
    
    // Nếu API đã trả về 'completed' thì hàm này trả về 'completed' ở dòng đầu rồi.
    // Logic dưới đây chỉ dự phòng cho các trận nhập tay.
    if (sameDayEvents.length === 1) return 'live';

    if (index < sameDayEvents.length - 1) {
        const nextEventTime = new Date(sameDayEvents[index + 1].time);
        return (now >= eventTime && now < nextEventTime) ? 'live' : 'completed';
    } else {
        // Last match logic
        let totalDuration = 0;
        let count = 0;
        for (let i = 0; i < sameDayEvents.length - 1; i++) {
            const start = new Date(sameDayEvents[i].time);
            const end = new Date(sameDayEvents[i+1].time);
            totalDuration += (end - start);
            count++;
        }
        const avgDuration = count > 0 ? totalDuration / count : 45 * 60 * 1000; 
        const endTime = new Date(eventTime.getTime() + avgDuration);
        return (now >= eventTime && now < endTime) ? 'live' : 'completed';
    }
};

// --- HELPER: TIME COUNTDOWN HOOK ---
const useCountdown = (targetDate) => {
  const calculateTimeLeft = () => {
    const difference = +new Date(targetDate) - +new Date();
    let timeLeft = {};
    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }
    return timeLeft;
  };
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  useEffect(() => {
    const timer = setTimeout(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearTimeout(timer);
  });
  return timeLeft;
};

// --- HELPER: NOTIFICATIONS ---
const Toast = ({ notification, onClose }) => {
    if (!notification) return null;
    const styles = {
        success: { bg: 'bg-green-600', icon: <CheckCircle className="w-5 h-5"/> },
        error: { bg: 'bg-red-600', icon: <AlertCircle className="w-5 h-5"/> },
        info: { bg: 'bg-blue-600', icon: <Info className="w-5 h-5"/> }
    };
    const style = styles[notification.type] || styles.info;
    return (
        <div className={`fixed bottom-4 right-4 ${style.bg} text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-slide-in-up z-50 max-w-sm`}>
            {style.icon}
            <p className="text-sm font-medium">{notification.message}</p>
            <button onClick={onClose} className="hover:bg-white/20 p-1 rounded"><X className="w-4 h-4"/></button>
        </div>
    );
};

// --- HELPER: IMPORT MODAL ---
const ImportModal = ({ onClose, onFileSelect, onJsonPaste, onClearData }) => {
    const [jsonText, setJsonText] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false); 
    
    const handlePasteSubmit = () => {
        if (!jsonText.trim()) return;
        try {
            const parsed = JSON.parse(jsonText);
            onJsonPaste(parsed);
        } catch (e) {
            alert('Chuỗi JSON không hợp lệ. Vui lòng kiểm tra lại.');
        }
    };

    const handleDeleteClick = () => {
        if (confirmDelete) {
            onClearData();
        } else {
            setConfirmDelete(true);
            setTimeout(() => setConfirmDelete(false), 3000);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 w-full max-w-md rounded-xl border border-gray-700 shadow-2xl p-6 animate-scale-in">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Upload size={20}/> Nhập Dữ Liệu</h3>
                <div className="space-y-6">
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-dashed border-gray-600 text-center hover:bg-gray-900 transition cursor-pointer" onClick={onFileSelect}>
                        <FileJson className="mx-auto text-blue-400 mb-2" size={32}/>
                        <p className="text-sm text-gray-300 font-medium">Tải lên file .json</p>
                        <p className="text-xs text-gray-500">Click để chọn file từ máy</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-px bg-gray-700 flex-1"></div><span className="text-xs text-gray-500 uppercase">Hoặc</span><div className="h-px bg-gray-700 flex-1"></div>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-2">Dán nội dung JSON (từ Tool/AI)</label>
                        <p className="text-[10px] text-gray-500 mb-2 italic">* Dữ liệu sẽ được thêm vào (không xóa dữ liệu cũ)</p>
                        <textarea value={jsonText} onChange={(e) => setJsonText(e.target.value)} placeholder='[ { "id": "val-123", ... } ]' className="w-full h-32 bg-gray-900 text-gray-300 text-xs font-mono p-3 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"></textarea>
                        <button onClick={handlePasteSubmit} disabled={!jsonText} className="mt-2 w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded text-sm font-bold flex items-center justify-center gap-2"><Clipboard size={16}/> Cập nhật (Merge)</button>
                    </div>
                    <div className="pt-2 border-t border-gray-700">
                         <button 
                            onClick={handleDeleteClick} 
                            className={`w-full py-2 rounded text-xs font-bold flex items-center justify-center gap-1 transition uppercase tracking-wide border ${
                                confirmDelete 
                                ? 'bg-red-600 text-white border-red-500 animate-pulse' 
                                : 'bg-red-900/20 text-red-400 hover:bg-red-900/40 border-red-900/50'
                            }`}
                         >
                            <Trash2 size={12}/> {confirmDelete ? 'Bấm lần nữa để xác nhận XÓA HẾT' : 'Xóa toàn bộ dữ liệu hiện có'}
                         </button>
                    </div>
                </div>
                <div className="mt-4 flex justify-end"><button onClick={onClose} className="text-gray-400 hover:text-white text-sm">Đóng</button></div>
            </div>
        </div>
    );
};

// --- HELPER: EVENT EDITOR MODAL ---
const EventEditor = ({ event, onSave, onCancel, onDelete, activeGame }) => {
    const [formData, setFormData] = useState(event || { id: '', game: activeGame !== 'all' ? activeGame : 'aov', tournament: '', stage: '', team1: 'TBD', team2: 'TBD', score1: '', score2: '', time: new Date().toISOString(), status: 'upcoming', type: activeGame === 'pubg' ? 'battle_royale' : 'match', details: { map: '', kills: '', leaderboard: '' } });
    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name && name.startsWith('details.')) {
            const detailField = name.split('.')[1];
            if (formData.game === 'pubg' && detailField === 'kills') {
                const kills = parseInt(value) || 0;
                setFormData(prev => ({ ...prev, score1: 10, details: { ...prev.details, kills: value, totalPoints: kills + 10 } }));
            } else {
                setFormData(prev => ({ ...prev, details: { ...prev.details, [detailField]: value } }));
            }
        } else if (name) setFormData(prev => ({ ...prev, [name]: value }));
    };
    const handleDateChange = (e) => { const val = e.target.value; if (!val) { setFormData(prev => ({ ...prev, time: '' })); return; } const date = new Date(val); setFormData(prev => ({ ...prev, time: date.toISOString() })); };
    const isBattleRoyale = formData.game === 'pubg' || formData.type === 'battle_royale';
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg border border-gray-700 shadow-2xl overflow-y-auto max-h-[90vh]">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Edit3 size={20} /> {event?.id ? 'Chỉnh sửa Trận đấu' : 'Thêm Trận đấu Mới'}</h3>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs text-gray-400 mb-1">Môn thi đấu</label><select name="game" value={formData.game} onChange={handleChange} className="w-full bg-gray-900 text-white rounded p-2 border border-gray-700 text-sm">{Object.keys(GAMES).filter(k=>k!=='all').map(k => <option key={k} value={k}>{GAMES[k].label}</option>)}</select></div>
                        <div><label className="block text-xs text-gray-400 mb-1 flex items-center gap-1"><Clock size={12}/> Thời gian (Giờ địa phương)</label><input type="datetime-local" name="time" value={formatDateForInput(formData.time)} onChange={handleDateChange} className="w-full bg-gray-900 text-white rounded p-2 border border-gray-700 text-sm font-mono" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4"><input type="text" name="tournament" placeholder="Tên Giải đấu" value={formData.tournament ?? ''} onChange={handleChange} className="bg-gray-900 text-white rounded p-2 border border-gray-700 text-sm" /><input type="text" name="stage" placeholder="Vòng đấu (Vd: Lower Final)" value={formData.stage ?? ''} onChange={handleChange} className="bg-gray-900 text-white rounded p-2 border border-gray-700 text-sm" /></div>
                    {!isBattleRoyale ? (
                        <div className="grid grid-cols-12 gap-2 items-center"><input type="text" name="team1" placeholder="Đội 1" value={formData.team1 ?? ''} onChange={handleChange} className="col-span-4 bg-gray-900 text-white rounded p-2 border border-gray-700 text-sm" /><input type="number" name="score1" placeholder="0" value={formData.score1 ?? ''} onChange={handleChange} className="col-span-2 bg-gray-900 text-center text-white rounded p-2 border border-gray-700 text-sm font-mono" /><span className="col-span-1 text-center text-gray-500">:</span><input type="number" name="score2" placeholder="0" value={formData.score2 ?? ''} onChange={handleChange} className="col-span-2 bg-gray-900 text-center text-white rounded p-2 border border-gray-700 text-sm font-mono" /><input type="text" name="team2" placeholder="Đội 2" value={formData.team2 ?? ''} onChange={handleChange} className="col-span-3 bg-gray-900 text-white rounded p-2 border border-gray-700 text-sm" /></div>
                    ) : (
                        <div className="space-y-3 bg-gray-900/50 p-3 rounded border border-gray-700">
                            <div className="flex gap-2"><div className="flex-1"><label className="block text-xs text-gray-400 mb-1 flex items-center gap-1"><Trophy size={12} className="text-yellow-500"/> Đội Top 1</label><input type="text" name="team1" placeholder="Tên đội thắng" value={formData.team1 ?? ''} onChange={handleChange} className="w-full bg-gray-900 text-yellow-400 font-bold rounded p-2 border border-gray-700 text-sm" /></div></div>
                            <div className="flex gap-2"><div className="flex-1"><label className="block text-xs text-gray-400 mb-1 flex items-center gap-1"><Target size={12} className="text-red-400"/> Số Kills</label><input type="number" name="details.kills" placeholder="Kills" value={formData.details?.kills ?? ''} onChange={handleChange} className="w-full bg-gray-900 text-white rounded p-2 border border-gray-700 text-sm font-mono" /></div><div className="flex-1"><label className="block text-xs text-gray-400 mb-1">Tổng Điểm (Kills + 10)</label><input type="number" name="details.totalPoints" placeholder="Auto" value={formData.details?.totalPoints ?? ''} readOnly className="w-full bg-gray-800 text-gray-300 rounded p-2 border border-gray-700 text-sm font-mono cursor-not-allowed" /></div></div>
                            <div><label className="block text-xs text-gray-400 mb-1">Map</label><input type="text" name="details.map" placeholder="Vd: Erangel, Miramar" value={formData.details?.map ?? ''} onChange={handleChange} className="w-full bg-gray-900 text-white rounded p-2 border border-gray-700 text-sm" /></div>
                        </div>
                    )}
                    <div><label className="block text-xs text-gray-400 mb-1">Trạng thái</label><select name="status" value={formData.status} onChange={handleChange} className="w-full bg-gray-900 text-white rounded p-2 border border-gray-700 text-sm"><option value="upcoming">Sắp tới</option><option value="live">Đang diễn ra</option><option value="completed">Đã kết thúc</option></select></div>
                </div>
                <div className="flex justify-between mt-6">
                    {event?.id && (<button onClick={() => onDelete(event.id)} className="px-4 py-2 bg-red-900/50 hover:bg-red-900 text-red-200 rounded text-sm flex items-center gap-1 transition"><Trash2 size={16} /> Xóa</button>)}
                    <div className="flex gap-2 ml-auto"><button onClick={onCancel} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition">Hủy</button><button onClick={() => onSave(formData)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm flex items-center gap-1 transition"><Save size={16} /> Lưu</button></div>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENT: CALENDAR VIEW ---
const CalendarView = ({ events, currentDate, onNavigate, onEditEvent, onAddEvent, isAdminMode, onDayClick }) => {
    const year = currentDate.getFullYear(); const month = currentDate.getMonth(); const daysInMonth = new Date(year, month + 1, 0).getDate(); const firstDayOfMonth = new Date(year, month, 1).getDay(); const startingBlankDays = firstDayOfMonth; 
    const weeks = []; let currentWeek = []; for (let i = 0; i < startingBlankDays; i++) { currentWeek.push(null); } for (let day = 1; day <= daysInMonth; day++) { currentWeek.push(day); if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = []; } } if (currentWeek.length > 0) { while (currentWeek.length < 7) { currentWeek.push(null); } weeks.push(currentWeek); }
    const monthNames = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
    return (
        <div className="bg-gray-900 rounded-lg border border-gray-800 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center gap-4"><h2 className="text-2xl font-bold text-white capitalize">{monthNames[month]} <span className="text-gray-500">{year}</span></h2><div className="flex gap-1"><button onClick={() => onNavigate(-1)} className="p-1 hover:bg-gray-700 rounded text-gray-300"><ChevronLeft/></button><button onClick={() => onNavigate(1)} className="p-1 hover:bg-gray-700 rounded text-gray-300"><ChevronRight/></button></div></div>
                <button onClick={() => onNavigate(0)} className="text-xs font-bold text-blue-400 hover:text-blue-300 uppercase">Hôm nay</button>
            </div>
            <div className="grid grid-cols-7 border-b border-gray-800 bg-gray-800">{['CN', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy'].map((d, i) => (<div key={i} className="py-2 text-center text-xs font-bold text-gray-400 uppercase tracking-wide border-r border-gray-800 last:border-r-0">{d}</div>))}</div>
            <div className="flex flex-col">{weeks.map((week, wIndex) => (<div key={wIndex} className="grid grid-cols-7 flex-1">{week.map((day, dIndex) => { if (!day) return <div key={dIndex} className="bg-gray-900/50 border-r border-b border-gray-800 min-h-[120px]"></div>; const dateObj = new Date(year, month, day); const isToday = new Date().toDateString() === dateObj.toDateString(); const dayEvents = events.filter(e => { const eDate = new Date(e.time); return eDate.getDate() === day && eDate.getMonth() === month && eDate.getFullYear() === year; }); return (
                <div key={dIndex} className={`relative border-r border-b border-gray-800 min-h-[120px] p-1 group transition-colors cursor-pointer ${isToday ? 'bg-blue-900/10' : 'hover:bg-gray-800/30'}`} onClick={(e) => { if(isAdminMode && e.target === e.currentTarget) { const setTime = new Date(year, month, day, 12, 0).toISOString(); onAddEvent({ time: setTime }); } else if (dayEvents.length > 0) { onDayClick(dateObj, dayEvents); } }}>
                    <div className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>{day}</div>
                    <div className="space-y-1">{dayEvents.slice(0, 3).map(ev => { const status = getComputedStatus(ev, events); const statusColor = status === 'live' ? 'border-red-500 bg-red-900/20 text-red-200' : 'border-l-2 border-gray-600'; return (<div key={ev.id} className={`text-[10px] px-2 py-1 rounded truncate shadow-sm ${statusColor} ${status === 'live' ? '' : (GAMES[ev.game]?.color || 'bg-gray-700')} ${GAMES[ev.game]?.text || 'text-white'}`}>{status === 'live' && <span className="animate-pulse font-bold mr-1">●</span>}{ev.game === 'pubg' ? 'PUBG' : `${ev.team1} v ${ev.team2}`}</div>); })}{dayEvents.length > 3 && (<div className="text-[9px] text-gray-500 text-center font-medium">+{dayEvents.length - 3} trận khác</div>)}</div>
                    {isAdminMode && (<div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none"><div className="bg-gray-900/80 p-1 rounded text-white text-[10px] flex items-center gap-1"><Plus size={10}/> Thêm</div></div>)}
                </div>); })}</div>))}</div>
        </div>
    );
};

const CountdownDisplay = ({ targetDate }) => {
    const timeLeft = useCountdown(targetDate); const hasTimeLeft = timeLeft.days !== undefined; if (!hasTimeLeft) return null;
    return (<div className="flex gap-2 text-xs font-mono text-blue-300 bg-blue-900/30 px-2 py-1 rounded border border-blue-500/30"><span className="flex items-center gap-1"><Timer size={10}/> Sắp diễn ra:</span><span>{timeLeft.days > 0 && `${timeLeft.days}d `}{timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s</span></div>);
};

// --- COMPONENT: SCHEDULE ITEM (REMAKELOGIC) ---
const ScheduleItem = ({ event, compact, allEvents, onFilterTournament }) => {
    const isBattleRoyale = event.game === 'pubg' || event.type === 'battle_royale';
    const isValorant = event.game === 'valorant';
    
    // Xử lý hiển thị thời gian
    const timeStr = new Date(event.time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
    const computedStatus = getComputedStatus(event, allEvents || []);
    const isLive = computedStatus === 'live';
    const isCompleted = computedStatus === 'completed';

    const statusBadge = isLive ? (
        <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-bold animate-pulse flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-white rounded-full"></span> LIVE
        </span>
    ) : isCompleted ? (
        <span className="text-[10px] bg-gray-700 text-gray-400 px-2 py-0.5 rounded font-bold">Ended</span>
    ) : (
        <span className="text-[10px] bg-blue-900 text-blue-200 px-2 py-0.5 rounded font-bold">Upcoming</span>
    );

    if (isBattleRoyale) {
        const showResult = (event.team1 && event.team1 !== 'TBD') || event.score1;
        return (
            <div className={`bg-gray-800 border-l-4 ${isLive ? 'border-red-500 ring-1 ring-red-500/20' : 'border-orange-600'} rounded shadow-sm hover:bg-gray-750 transition flex flex-col gap-2 ${compact ? 'p-2' : 'p-4'}`}>
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                         <div className="flex flex-col items-center min-w-[50px]">
                            <span className={`text-xl font-bold ${isLive ? 'text-red-400' : 'text-white'}`}>{timeStr}</span>
                            {!compact && <span className="text-[10px] bg-orange-900/50 text-orange-400 px-2 rounded uppercase font-bold tracking-wider">PUBG</span>}
                        </div>
                        <div>
                             <div className="text-sm font-bold text-white flex items-center gap-2 group cursor-pointer"
                                  onClick={(e) => { e.stopPropagation(); onFilterTournament && onFilterTournament(event.tournament); }}
                                  title="Xem tất cả trận của giải này">
                                 <span className="group-hover:text-blue-400 group-hover:underline">{event.tournament}</span>
                                 {statusBadge}
                             </div>
                             <div className="text-sm text-gray-400">{event.stage} • {event.details?.map || 'TBD'}</div>
                        </div>
                    </div>
                </div>
                {showResult && (
                    <div className={`mt-2 bg-gray-900/50 rounded p-2 flex items-center justify-between text-sm ${compact ? 'py-1 mt-1 text-xs' : ''}`}>
                        <div className="text-yellow-400 font-bold flex items-center gap-2">
                            <Trophy size={compact ? 12 : 14}/> 
                            <span className={compact ? "truncate max-w-[150px]" : ""}>{event.team1}</span>
                        </div>
                        {!compact && <div className="text-gray-400 flex items-center gap-1"><Target size={14}/> {event.details?.kills || 0} Kills</div>}
                    </div>
                )}
            </div>
        );
    }

    // Default layout (LoL, AoV, Valorant)
    return (
        <div className={`bg-gray-800 rounded hover:bg-gray-750 transition flex flex-col md:flex-row items-start md:items-center gap-4 border-l-4 ${isLive ? 'border-red-500 ring-1 ring-red-500/20' : (GAMES[event.game]?.color || 'border-gray-700').replace('bg-', 'border-')} ${compact ? 'p-3' : 'p-4'}`}>
            
            <div className="min-w-[60px] flex flex-col items-center justify-center">
                <div className={`text-xl font-bold ${isLive ? 'text-red-400' : 'text-white'}`}>{timeStr}</div>
                {!compact && (
                    <div className="mt-1 flex flex-col items-center">
                        {isValorant && event.details?.flag1 && event.details?.flag2 ? (
                            <div className="flex gap-1 opacity-70 mb-1">
                                <span className={`fi fi-${event.details.flag1} w-3 h-2`}></span>
                                <span className={`fi fi-${event.details.flag2} w-3 h-2`}></span>
                            </div>
                        ) : null}
                        {/* Always show Tag for Valorant as requested */}
                        <div className={`text-[9px] px-2 py-0.5 rounded-full uppercase ${GAMES[event.game]?.color || 'bg-gray-600'} text-white`}>
                            {event.game}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 w-full">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span 
                        className="text-xs font-bold text-gray-300 hover:text-blue-400 cursor-pointer flex items-center gap-1"
                        onClick={(e) => { e.stopPropagation(); onFilterTournament && onFilterTournament(event.tournament); }}
                    >
                        <Trophy size={12} className="text-yellow-500"/>
                        {event.tournament}
                    </span>
                    <span className="text-xs text-gray-500">• {event.stage}</span>
                    {statusBadge}
                    {isValorant && isLive && event.details?.map && (
                        <span className="text-[10px] bg-gray-700 text-green-400 px-1.5 py-0.5 rounded border border-gray-600 font-mono">
                            CURRENT MAP: {event.details.map}
                        </span>
                    )}
                </div>

                <div className="flex items-center justify-between bg-gray-900/50 p-2 rounded-lg border border-gray-800">
                    <div className={`flex-1 flex items-center gap-3 ${compact ? 'min-w-0' : ''}`}>
                        {isValorant && event.details?.team1_logo && !compact && (
                            <img src={event.details.team1_logo} alt={event.team1} className="w-8 h-8 object-contain" />
                        )}
                        <div className={`font-bold ${event.score1 > event.score2 ? 'text-white' : 'text-gray-400'} ${compact ? 'truncate' : ''}`}>
                            {event.team1}
                        </div>
                    </div>

                    <div className="px-4 flex flex-col items-center">
                        <div className={`text-xl font-mono font-bold tracking-widest ${isLive ? 'text-red-500' : 'text-white'}`}>
                            {event.score1} - {event.score2}
                        </div>
                        {isValorant && isLive && event.details?.round_ct1 !== undefined && (
                           <div className="text-[9px] text-gray-500 flex gap-1 mt-0.5">
                                <span title="CT Rounds" className="text-blue-400">{event.details.round_ct1 || 0}</span>
                                <span>/</span>
                                <span title="T Rounds" className="text-orange-400">{event.details.round_t1 || 0}</span>
                           </div>
                        )}
                    </div>

                    <div className={`flex-1 flex items-center justify-end gap-3 ${compact ? 'min-w-0' : ''}`}>
                        <div className={`font-bold text-right ${event.score2 > event.score1 ? 'text-white' : 'text-gray-400'} ${compact ? 'truncate' : ''}`}>
                            {event.team2 || 'TBD'}
                        </div>
                        {isValorant && event.details?.team2_logo && !compact && (
                            <img src={event.details.team2_logo} alt={event.team2} className="w-8 h-8 object-contain" />
                        )}
                    </div>
                </div>
                
                <div className="mt-1 flex justify-between items-center">
                    {!isCompleted && !isLive && !compact && <CountdownDisplay targetDate={event.time} />}
                    {isValorant && event.details?.match_page && (
                        <a href={event.details.match_page} target="_blank" rel="noreferrer" className="text-[10px] text-gray-500 hover:text-white flex items-center gap-1 ml-auto">
                            Chi tiết VLR.gg <ExternalLink size={10}/>
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- COMPONENT: DAY DETAILS MODAL ---
const DayDetailsModal = ({ date, events, allEvents, onClose, onEdit }) => {
    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-gray-800 w-full max-w-lg rounded-xl border border-gray-700 shadow-2xl p-6 max-h-[80vh] overflow-y-auto">
                 <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <CalendarIcon size={20} className="text-blue-400"/> 
                        {date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })}
                    </h3>
                    <button onClick={onClose} className="hover:bg-gray-700 p-1 rounded text-gray-400 hover:text-white transition"><X size={20}/></button>
                 </div>
                 <div className="space-y-0">
                    {events.map(event => (
                        <div key={event.id} className="relative group border-b border-gray-700 last:border-0 pb-3 mb-3 last:pb-0 last:mb-0">
                            <ScheduleItem event={event} allEvents={allEvents} compact={true} />
                            {onEdit && (
                                <button 
                                    onClick={() => onEdit(event)}
                                    className="absolute top-2 right-2 p-1.5 bg-blue-600 text-white rounded shadow hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                >
                                    <Edit3 size={14}/>
                                </button>
                            )}
                        </div>
                    ))}
                 </div>
                 <div className="mt-4 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition">Đóng</button>
                 </div>
            </div>
        </div>
    );
};

// --- VALORANT API INTEGRATION ---
const VLR_BASE_URL = '/api/vlr';

const parseRelativeTime = (timeAgoStr) => {
    if (!timeAgoStr || typeof timeAgoStr !== 'string') return null;
    
    // Nếu API trả về chuỗi ISO thì dùng luôn
    if (timeAgoStr.includes('T') && timeAgoStr.includes('Z')) return timeAgoStr;

    const now = new Date();
    // Regex đơn giản để bắt "2h", "44m", "1d", "yesterday"
    if (timeAgoStr.toLowerCase().includes('yesterday')) {
        now.setDate(now.getDate() - 1);
        return now.toISOString();
    }

    const matches = timeAgoStr.match(/(\d+)([hmd])/g);
    if (!matches) return null;

    matches.forEach(part => {
        const value = parseInt(part.slice(0, -1));
        const unit = part.slice(-1);
        if (unit === 'd') now.setDate(now.getDate() - value);
        if (unit === 'h') now.setHours(now.getHours() - value);
        if (unit === 'm') now.setMinutes(now.getMinutes() - value);
    });

    return now.toISOString();
}

const extractIdFromUrl = (url) => {
    if (!url) return `val-manual-${Date.now()}`;
    const match = url.match(/\/(\d+)\//);
    return match ? `val-${match[1]}` : `val-${Date.now()}`;
};

const normalizeVlrMatch = (vlrMatch, type) => {
    let timeISO = new Date().toISOString(); // Default fallback
    
    if (vlrMatch.unix_timestamp) {
        let timestampStr = vlrMatch.unix_timestamp;
        // Kiểm tra nếu là format SQL (không có T hoặc Z)
        if (!timestampStr.includes('T') && !timestampStr.includes('Z')) {
             // Thay khoảng trắng bằng T và thêm Z để báo hiệu UTC
             timestampStr = timestampStr.replace(' ', 'T') + 'Z';
        }
        timeISO = new Date(timestampStr).toISOString();
    } 
    // 2. Nếu là Results, thường không có timestamp chính xác, dùng time_completed "ago"
    else if (type === 'results' && vlrMatch.time_completed) {
        const relTime = parseRelativeTime(vlrMatch.time_completed);
        if (relTime) timeISO = relTime;
    }

    let status = 'upcoming';
    if (type === 'live_score') status = 'live';
    else if (type === 'results') status = 'completed';

    // Xử lý link (Fix #4)
    let matchUrl = vlrMatch.match_page || vlrMatch.match_url || '';
    if (matchUrl && !matchUrl.startsWith('http')) {
        matchUrl = `https://www.vlr.gg${matchUrl}`;
    }

    return {
        id: extractIdFromUrl(matchUrl),
        game: 'valorant',
        tournament: vlrMatch.match_event || vlrMatch.tournament_name || 'Unknown Tournament',
        stage: vlrMatch.match_series || vlrMatch.round_info || '',
        team1: vlrMatch.team1 || vlrMatch.team_one_name || 'TBD',
        team2: vlrMatch.team2 || vlrMatch.team_two_name || 'TBD',
        // Fix #1: Score handle null/undefined
        score1: vlrMatch.score1 ?? vlrMatch.team_one_score ?? (type === 'live_score' ? 0 : null),
        score2: vlrMatch.score2 ?? vlrMatch.team_two_score ?? (type === 'live_score' ? 0 : null),
        time: timeISO,
        status: status,
        details: {
            map: vlrMatch.current_map || '',
            team1_logo: vlrMatch.team1_logo || vlrMatch.team_logo || '',
            team2_logo: vlrMatch.team2_logo || '',
            flag1: vlrMatch.flag1 || '',
            flag2: vlrMatch.flag2 || '',
            round_ct1: vlrMatch.team1_round_ct,
            round_t1: vlrMatch.team1_round_t,   
            round_ct2: vlrMatch.team2_round_ct,
            round_t2: vlrMatch.team2_round_t,
            match_page: matchUrl
        }
    };
};

const fetchValorantData = async () => {
    try {
        const fetchWithProxy = async (endpoint) => {
            const url = `${VLR_BASE_URL}${endpoint}`;
            
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
        };

        const [upcomingRes, liveRes, resultsRes] = await Promise.all([
            fetchWithProxy('/match?q=upcoming'),
            fetchWithProxy('/match?q=live_score'),
            fetchWithProxy('/match?q=results') 
        ]);

        let newEvents = [];

        // LIVE
        if (liveRes.data?.segments) {
            newEvents = newEvents.concat(liveRes.data.segments.map(m => normalizeVlrMatch(m, 'live_score')));
        }
        // UPCOMING
        if (upcomingRes.data?.segments) {
            newEvents = newEvents.concat(upcomingRes.data.segments.map(m => normalizeVlrMatch(m, 'upcoming')));
        }
        // RESULTS (Limit 30 recent)
        if (resultsRes.data?.segments) {
            newEvents = newEvents.concat(resultsRes.data.segments.slice(0, 30).map(m => normalizeVlrMatch(m, 'results')));
        }

        return newEvents;
    } catch (error) {
        console.error("Lỗi fetch VLR API:", error);
        return [];
    }
};

// --- MAIN APP ---
export default function App() {
  const [activeGame, setActiveGame] = useState('all');
  const [viewMode, setViewMode] = useState('schedule');
  const [selectedTournaments, setSelectedTournaments] = useState([]); // Array các giải đấu được chọn (Filter #7)
  
  const [events, setEvents] = useState(() => {
      try {
          const savedData = localStorage.getItem('esport_hub_data');
          return savedData ? JSON.parse(savedData) : INITIAL_EVENTS;
      } catch (e) {
          console.error("Lỗi đọc localStorage:", e);
          return INITIAL_EVENTS;
      }
  });

  useEffect(() => {
      try {
          localStorage.setItem('esport_hub_data', JSON.stringify(events));
      } catch (e) {
          console.error("Lỗi lưu localStorage:", e);
      }
  }, [events]);

  // Favicon
  useEffect(() => {
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/svg+xml';
    link.rel = 'icon';
    link.href = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23fbbf24%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22M6 9H4.5a2.5 2.5 0 0 1 0-5H6%22/><path d=%22M18 9h1.5a2.5 2.5 0 0 0 0-5H18%22/><path d=%22M4 22h16%22/><path d=%22M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22%22/><path d=%22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22%22/><path d=%22M18 2H6v7a6 6 0 0 0 12 0V2Z%22/></svg>`;
    document.head.appendChild(link);
  }, []);

  const [isUpdating, setIsUpdating] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showHistory, setShowHistory] = useState(false); 
  const [selectedDayDetails, setSelectedDayDetails] = useState(null); 
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  const fileInputRef = useRef(null);

  const showNotification = (type, message) => { setNotification({ type, message }); setTimeout(() => setNotification(null), 3000); };
  
  const handleSaveEvent = (eventData) => { 
      let updatedList; 
      if (!eventData.id) { 
          const newEvent = { ...eventData, id: `manual-${Date.now()}` }; 
          updatedList = [...events, newEvent]; 
          showNotification('success', 'Đã thêm trận đấu mới'); 
      } else { 
          updatedList = events.map(e => e.id === eventData.id ? eventData : e); 
          showNotification('success', 'Đã cập nhật trận đấu'); 
      } 
      setEvents(updatedList); 
      setEditingEvent(null); 
      if(selectedDayDetails) setSelectedDayDetails(null); 
  };

  const handleDeleteEvent = (id) => { if (window.confirm('Bạn có chắc chắn muốn xóa trận đấu này?')) { setEvents(prev => prev.filter(e => e.id !== id)); setEditingEvent(null); showNotification('success', 'Đã xóa trận đấu'); } };
  const handleCalendarNavigate = (direction) => { if (direction === 0) setCalendarDate(new Date()); else setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + direction, 1)); };
  const handleExport = () => { const dataStr = JSON.stringify(events, null, 2); const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr); const linkElement = document.createElement('a'); linkElement.setAttribute('href', dataUri); linkElement.setAttribute('download', `esports_schedule_${new Date().toISOString().slice(0,10)}.json`); linkElement.click(); showNotification('success', 'Đã xuất dữ liệu thành công!'); };
  const handleFileSelect = () => fileInputRef.current.click();
  
  const mergeEvents = (currentEvents, newEvents) => {
      const eventMap = new Map();
      currentEvents.forEach(e => eventMap.set(e.id, e));
      let addedCount = 0;
      let updatedCount = 0;
      newEvents.forEach(e => {
          if (eventMap.has(e.id)) {
              eventMap.set(e.id, e);
              updatedCount++;
          } else {
              eventMap.set(e.id, e);
              addedCount++;
          }
      });
      return { 
          mergedList: Array.from(eventMap.values()), 
          added: addedCount, 
          updated: updatedCount 
      };
  };

  const handleFileChange = (e) => { 
      const file = e.target.files[0]; 
      if (!file) return; 
      const reader = new FileReader(); 
      reader.onload = (event) => { 
          try { 
              const importedEvents = JSON.parse(event.target.result); 
              if (Array.isArray(importedEvents)) { 
                  const { mergedList, added, updated } = mergeEvents(events, importedEvents);
                  setEvents(mergedList); 
                  setIsImportModalOpen(false); 
                  showNotification('success', `Đã nhập xong: Thêm ${added}, Cập nhật ${updated} trận!`); 
              } else { 
                  showNotification('error', 'File không hợp lệ.'); 
              } 
          } catch (err) { 
              showNotification('error', 'Lỗi khi đọc file.'); 
          } 
      }; 
      reader.readAsText(file); 
      e.target.value = null; 
  };

  const handleImportFromGist = async (isAuto = false) => { 
      setIsUpdating(true); 
      try { 
          const response = await fetch('https://api.github.com/gists/72c7ec933d0fe55a5e2e482b89d108c6'); 
          if (!response.ok) throw new Error('Error'); 
          const data = await response.json(); 
          const firstFile = Object.values(data.files)[0]; 
          if (firstFile && firstFile.content) { 
              const importedEvents = JSON.parse(firstFile.content); 
              if (Array.isArray(importedEvents)) { 
                  const { mergedList } = mergeEvents(events, importedEvents);
                  setEvents(mergedList); 
                  setLastUpdated(new Date(data.updated_at)); 
                  showNotification('success', isAuto ? 'Đã tự động cập nhật dữ liệu!' : 'Đã cập nhật từ Gist!'); 
              } 
          } 
      } catch (error) { 
          if (!isAuto) showNotification('error', 'Lỗi tải Gist.'); 
      } finally { 
          setIsUpdating(false); 
      } 
  };

  const handleJsonPaste = (importedEvents) => { 
      if (Array.isArray(importedEvents)) { 
          const { mergedList, added, updated } = mergeEvents(events, importedEvents);
          setEvents(mergedList); 
          setIsImportModalOpen(false); 
          showNotification('success', `Đã nhập xong: Thêm ${added}, Cập nhật ${updated} trận!`); 
      } else { 
          alert('Dữ liệu không phải là danh sách trận đấu hợp lệ.'); 
      } 
  };

  const handleAutoUpdateValorant = async () => {
    setIsUpdating(true);
    try {
        const vlrEvents = await fetchValorantData();
        if (vlrEvents.length > 0) {
            setEvents(prevEvents => {
                const { mergedList } = mergeEvents(prevEvents, vlrEvents);
                return mergedList;
            });
            setLastUpdated(new Date());
            showNotification('success', `Đã cập nhật ${vlrEvents.length} trận đấu Valorant từ VLR.gg!`);
        }
    } catch (e) {
        console.error("Lỗi cập nhật Valorant:", e);
    } finally {
        setIsUpdating(false);
    }
  };

  useEffect(() => {
      handleImportFromGist(true);
      handleAutoUpdateValorant();
      const interval = setInterval(handleAutoUpdateValorant, 5 * 60 * 1000);
      return () => clearInterval(interval);
  }, []);
  
  // --- LOGIC LỌC (FILTER) & TOURNAMENT LIST ---
  const activeTournaments = useMemo(() => {
      // Lấy danh sách giải đấu duy nhất từ các sự kiện hiện có, phụ thuộc vào game đang chọn
      let sourceEvents = events;
      if (activeGame !== 'all') {
          sourceEvents = events.filter(e => e.game === activeGame);
      }
      // Chỉ lấy các giải có trận sắp tới hoặc live để filter cho gọn
      const relevantEvents = sourceEvents.filter(e => e.status !== 'completed');
      const tournaments = [...new Set(relevantEvents.map(e => e.tournament))];
      return tournaments.sort();
  }, [events, activeGame]);

  const toggleTournamentFilter = (tourney) => {
      setSelectedTournaments(prev => {
          if (prev.includes(tourney)) return prev.filter(t => t !== tourney);
          return [...prev, tourney];
      });
  };

  const filteredEvents = useMemo(() => {
    let result = events;
    
    // Lọc theo Game
    if (activeGame !== 'all') {
        result = result.filter(e => e.game === activeGame);
    }

    // Lọc theo Tournament (Multiselect) #7
    if (selectedTournaments.length > 0) {
        result = result.filter(e => selectedTournaments.includes(e.tournament));
    }

    return [...result].sort((a, b) => new Date(a.time) - new Date(b.time));
  }, [activeGame, events, selectedTournaments]);

  const { upcomingGroups, pastGroups } = useMemo(() => { 
      const groups = { upcomingGroups: [], pastGroups: [] }; 
      const today = new Date(); 
      today.setHours(0,0,0,0); 
      
      const addToGroupList = (list, event) => {
          const eDate = new Date(event.time);
          const dateStr = eDate.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' });
          const dateValue = new Date(eDate.getFullYear(), eDate.getMonth(), eDate.getDate()).getTime();
          
          let group = list.find(g => g.dateStr === dateStr);
          if (!group) {
              group = { dateStr, dateValue, events: [] };
              list.push(group);
          }
          group.events.push(event);
      };

      filteredEvents.forEach(e => { 
          const eDate = new Date(e.time); 
          const dateKey = new Date(eDate.getFullYear(), eDate.getMonth(), eDate.getDate()); 
          
          if (dateKey < today) { 
              addToGroupList(groups.pastGroups, e);
          } else { 
              addToGroupList(groups.upcomingGroups, e);
          } 
      }); 
      
      groups.upcomingGroups.sort((a, b) => a.dateValue - b.dateValue);
      groups.pastGroups.sort((a, b) => b.dateValue - a.dateValue);

      return groups; 
  }, [filteredEvents]);
  
  const [tick, setTick] = useState(0); useEffect(() => { const interval = setInterval(() => setTick(t => t + 1), 60000); return () => clearInterval(interval); }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      <Toast notification={notification} onClose={() => setNotification(null)} />
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
      {editingEvent && (<EventEditor event={editingEvent.id === 'new' ? null : editingEvent} activeGame={activeGame} onSave={handleSaveEvent} onCancel={() => setEditingEvent(null)} onDelete={handleDeleteEvent} />)}
      {selectedDayDetails && (
        <DayDetailsModal 
            date={selectedDayDetails.date} 
            events={selectedDayDetails.events} 
            allEvents={events} 
            onClose={() => setSelectedDayDetails(null)} 
            onEdit={isAdminMode ? (ev) => setEditingEvent(ev) : null}
        />
      )}
      {isImportModalOpen && (
        <ImportModal 
            onClose={() => setIsImportModalOpen(false)} 
            onFileSelect={handleFileSelect} 
            onJsonPaste={handleJsonPaste} 
            onClearData={() => { setEvents([]); setIsImportModalOpen(false); showNotification('success', 'Đã xóa toàn bộ dữ liệu.'); }}
        />
      )}

      <header className="bg-gray-900 border-b border-gray-800 p-4 sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setSelectedTournaments([]); setActiveGame('all'); }}>
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-lg">
                <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">Esports Hub</h1>
                <p className="text-xs text-gray-400">Quản lý & Theo dõi lịch thi đấu</p>
            </div>
          </div>
          <div className="flex bg-gray-800 p-1 rounded-lg overflow-x-auto max-w-full"><button onClick={() => setViewMode('schedule')} className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${viewMode === 'schedule' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}><List size={16} /> Danh sách</button><button onClick={() => setViewMode('calendar')} className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${viewMode === 'calendar' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}><CalendarIcon size={16} /> Lịch (Calendar)</button></div>
          <div className="flex items-center gap-3">
              <div className="flex gap-1 mr-2"><button onClick={() => { handleImportFromGist(false); handleAutoUpdateValorant(); }} disabled={isUpdating} className={`p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`} title="Cập nhật (Gist + VLR)"><CloudDownload size={18} className={isUpdating ? 'animate-bounce' : ''} /></button><button onClick={handleExport} className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition" title="Xuất dữ liệu"><Download size={18} /></button><button onClick={() => setIsImportModalOpen(true)} className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition" title="Nhập dữ liệu"><Upload size={18} /></button></div>
              <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-full border border-gray-700"><span className={`text-xs font-bold ${isAdminMode ? 'text-green-400' : 'text-gray-500'}`}>{isAdminMode ? 'Admin: ON' : 'Admin: OFF'}</span><button onClick={() => setIsAdminMode(!isAdminMode)} className={`w-10 h-5 rounded-full p-1 transition-colors duration-300 ${isAdminMode ? 'bg-green-600' : 'bg-gray-600'}`}><div className={`w-3 h-3 bg-white rounded-full transition-transform duration-300 ${isAdminMode ? 'translate-x-5' : 'translate-x-0'}`} /></button></div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row mt-6 gap-6 px-4 pb-12 relative">
        <aside className="w-full md:w-64 flex-shrink-0 md:sticky md:top-24 h-fit transition-all">
            <h2 className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-4 px-2">Môn Thi Đấu</h2>
            <div className="space-y-2">{Object.entries(GAMES).map(([key, data]) => (<button key={key} onClick={() => { setActiveGame(key); setSelectedTournaments([]); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition text-left ${activeGame === key ? 'bg-gray-800 text-white border-l-4 border-blue-500 shadow-md' : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200'}`}><data.icon size={18} className={activeGame === key ? 'text-blue-400' : 'text-gray-500'} /><span className="font-medium text-sm">{data.label}</span>{activeGame === key && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500"></div>}</button>))}</div>
             {lastUpdated && (<div className="mt-4 px-4"><p className="text-[10px] text-gray-500 italic flex items-center gap-1"><CloudDownload size={10}/> Latest data update: <br/> {lastUpdated.toLocaleString('vi-VN')}</p></div>)}
             {isAdminMode && (<div className="mt-6 bg-blue-900/20 p-4 rounded-xl border border-blue-900/50 text-xs text-blue-200"><p className="font-bold mb-1">Chế độ Admin:</p><ul className="list-disc pl-4 space-y-1 text-gray-400"><li>Sửa trực tiếp trận đấu để cập nhật kết quả.</li><li>Bấm vào ngày trong Lịch để xem chi tiết & chỉnh sửa.</li></ul></div>)}
        </aside>

        <main className="flex-1 min-w-0 relative">
            {viewMode === 'schedule' && (
                <div className="space-y-6">
                    {/* TOURNAMENT FILTER BAR (Fix #7) */}
                    {activeTournaments.length > 0 && (
                        <div className="bg-gray-900/50 border border-gray-800 p-3 rounded-lg overflow-x-auto whitespace-nowrap scrollbar-hide flex items-center gap-2">
                            <div className="flex items-center gap-1 text-gray-500 text-xs mr-2 font-bold uppercase tracking-wider">
                                <Filter size={14} /> Giải đấu:
                            </div>
                            {activeTournaments.map(tourney => (
                                <button
                                    key={tourney}
                                    onClick={() => toggleTournamentFilter(tourney)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition border ${
                                        selectedTournaments.includes(tourney) 
                                        ? 'bg-blue-600 border-blue-500 text-white' 
                                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white'
                                    }`}
                                >
                                    {tourney}
                                </button>
                            ))}
                            {selectedTournaments.length > 0 && (
                                <button onClick={() => setSelectedTournaments([])} className="px-2 py-1 ml-auto text-xs text-red-400 hover:text-red-300">Xóa lọc</button>
                            )}
                        </div>
                    )}

                    {isAdminMode && (<button onClick={() => setEditingEvent({ id: 'new' })} className="w-full py-3 border-2 border-dashed border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-500 hover:bg-gray-800 transition flex items-center justify-center gap-2"><Plus size={20} /> Thêm Trận Đấu Thủ Công</button>)}
                    
                    {pastGroups.length > 0 && (<div className="text-center"><button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 mx-auto text-gray-500 hover:text-white transition text-xs font-bold uppercase tracking-wider py-2 px-4 rounded-full border border-gray-800 hover:border-gray-600 bg-gray-900"><History size={14}/> {showHistory ? 'Ẩn trận đấu đã qua' : `Xem ${pastGroups.reduce((acc, g) => acc + g.events.length, 0)} trận đấu đã qua`}</button></div>)}
                    
                    {showHistory && pastGroups.map((group) => (
                        <div key={group.dateStr} className="animate-fade-in opacity-75"><div className="bg-gray-800/50 px-4 py-2 rounded-t-lg border-b border-gray-700 flex items-center gap-2"><CalendarIcon className="w-4 h-4 text-gray-500" /><h3 className="font-bold text-gray-400 capitalize">{group.dateStr} (Đã qua)</h3></div><div className="bg-gray-900 rounded-b-lg p-2 space-y-2">{group.events.sort((a,b) => new Date(a.time) - new Date(b.time)).map(event => (<div key={event.id} className="relative group"><ScheduleItem event={event} allEvents={events} onFilterTournament={(t) => setSelectedTournaments([t])} />{isAdminMode && (<div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => setEditingEvent(event)} className="p-1.5 bg-blue-600 text-white rounded shadow hover:bg-blue-500"><Edit3 size={14}/></button><button onClick={() => handleDeleteEvent(event.id)} className="p-1.5 bg-red-600 text-white rounded shadow hover:bg-red-500"><Trash2 size={14}/></button></div>)}</div>))}</div></div>
                    ))}
                    
                    {upcomingGroups.length === 0 && pastGroups.length === 0 && (<div className="flex flex-col items-center justify-center h-64 bg-gray-900/50 rounded-lg"><Trophy className="w-12 h-12 text-gray-700 mb-2"/><p className="text-gray-500">Chưa có lịch thi đấu nào cho bộ lọc này.</p>{selectedTournaments.length > 0 && <button onClick={() => setSelectedTournaments([])} className="mt-2 text-blue-400 text-sm hover:underline">Hiện tất cả</button>}</div>)}
                    
                    {upcomingGroups.map((group) => (
                        <div key={group.dateStr} className="animate-fade-in"><div className="bg-gray-800/50 px-4 py-2 rounded-t-lg border-b border-gray-700 flex items-center gap-2 sticky top-[72px] z-10 backdrop-blur-md"><CalendarIcon className="w-4 h-4 text-blue-400" /><h3 className="font-bold text-blue-100 capitalize">{group.dateStr}</h3>{group.dateStr === new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' }) && <span className="ml-2 text-[10px] bg-red-600 text-white px-2 rounded font-bold animate-pulse">Hôm nay</span>}</div><div className="bg-gray-900 rounded-b-lg p-2 space-y-2">{group.events.sort((a,b) => new Date(a.time) - new Date(b.time)).map(event => (<div key={event.id} className="relative group"><ScheduleItem event={event} allEvents={events} onFilterTournament={(t) => setSelectedTournaments([t])} />{isAdminMode && (<div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => setEditingEvent(event)} className="p-1.5 bg-blue-600 text-white rounded shadow hover:bg-blue-500"><Edit3 size={14}/></button><button onClick={() => handleDeleteEvent(event.id)} className="p-1.5 bg-red-600 text-white rounded shadow hover:bg-red-500"><Trash2 size={14}/></button></div>)}</div>))}</div></div>
                    ))}
                    {isAdminMode && (<button onClick={() => setEditingEvent({ id: 'new' })} className="w-full py-3 border-2 border-dashed border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-500 hover:bg-gray-800 transition flex items-center justify-center gap-2 mt-4"><Plus size={20} /> Thêm Trận Đấu Thủ Công</button>)}
                </div>
            )}
            {viewMode === 'calendar' && (<CalendarView events={filteredEvents} currentDate={calendarDate} onNavigate={handleCalendarNavigate} onEditEvent={setEditingEvent} onAddEvent={(preset) => setEditingEvent({ id: 'new', ...preset })} isAdminMode={isAdminMode} onDayClick={(date, events) => setSelectedDayDetails({ date, events })} />)}
        </main>
      </div>
    </div>
  );
}