/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  CheckSquare, 
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Activity,
  ArrowDown,
  Quote,
  Target,
  Edit3
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip,
  CartesianGrid
} from 'recharts';
import { 
  format, 
  addDays, 
  subDays, 
  isSameDay, 
  startOfDay, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval,
  subMonths,
  subWeeks,
  isSameMonth,
  startOfWeek,
  endOfWeek,
  isSameWeek,
  startOfYear,
  endOfYear,
  isSameYear,
  eachMonthOfInterval,
  eachWeekOfInterval
} from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  createdAt: number;
  date: string;
  notes?: string;
  subtasks?: Subtask[];
  links?: string[];
}

interface WeeklyTarget {
  id: string;
  text: string;
  completed: boolean;
  week: string; // ISO string for the start of the week
}

interface MonthlyTarget {
  id: string;
  text: string;
  completed: boolean;
  month: string; // ISO string for the start of the month
}

interface SkillLog {
  date: string;
  hours: number;
}

interface Skill {
  id: string;
  name: string;
  logs: SkillLog[];
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('daily-pulse-tasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [weeklyTargets, setWeeklyTargets] = useState<WeeklyTarget[]>(() => {
    const saved = localStorage.getItem('daily-pulse-weekly-targets');
    return saved ? JSON.parse(saved) : [];
  });
  const [monthlyTargets, setMonthlyTargets] = useState<MonthlyTarget[]>(() => {
    const saved = localStorage.getItem('daily-pulse-monthly-targets');
    return saved ? JSON.parse(saved) : [];
  });
  const [newTaskText, setNewTaskText] = useState('');
  const [newWeeklyTargetText, setNewWeeklyTargetText] = useState('');
  const [newTargetText, setNewTargetText] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Auto-refresh date at midnight
  useEffect(() => {
    const checkDate = () => {
      const now = startOfDay(new Date());
      if (now.getTime() !== selectedDate.getTime()) {
        setSelectedDate(now);
      }
    };

    const interval = setInterval(checkDate, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [selectedDate]);

  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [newLinkText, setNewLinkText] = useState('');
  const [resolution, setResolution] = useState(() => localStorage.getItem('daily-pulse-resolution') || '');
  const [motivation, setMotivation] = useState(() => localStorage.getItem('daily-pulse-motivation') || '');
  const [isEditingResolution, setIsEditingResolution] = useState(false);
  const [tempResolution, setTempResolution] = useState(resolution);
  const [tempMotivation, setTempMotivation] = useState(motivation);
  const [skills, setSkills] = useState<Skill[]>(() => {
    const saved = localStorage.getItem('daily-pulse-skills');
    return saved ? JSON.parse(saved) : [];
  });
  const [newSkillName, setNewSkillName] = useState('');
  const [isAddingSkill, setIsAddingSkill] = useState(false);

  useEffect(() => {
    localStorage.setItem('daily-pulse-tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('daily-pulse-weekly-targets', JSON.stringify(weeklyTargets));
  }, [weeklyTargets]);

  useEffect(() => {
    localStorage.setItem('daily-pulse-monthly-targets', JSON.stringify(monthlyTargets));
  }, [monthlyTargets]);

  useEffect(() => {
    localStorage.setItem('daily-pulse-resolution', resolution);
  }, [resolution]);

  useEffect(() => {
    localStorage.setItem('daily-pulse-motivation', motivation);
  }, [motivation]);

  useEffect(() => {
    localStorage.setItem('daily-pulse-skills', JSON.stringify(skills));
  }, [skills]);

  const saveResolution = () => {
    setResolution(tempResolution);
    setMotivation(tempMotivation);
    setIsEditingResolution(false);
  };

  const addSkill = () => {
    if (!newSkillName.trim()) return;
    const newSkill: Skill = {
      id: crypto.randomUUID(),
      name: newSkillName.trim(),
      logs: []
    };
    setSkills([...skills, newSkill]);
    setNewSkillName('');
    setIsAddingSkill(false);
  };

  const deleteSkill = (id: string) => {
    setSkills(skills.filter(s => s.id !== id));
  };

  const logSkillHours = (skillId: string, date: Date, hours: number) => {
    const dateStr = startOfDay(date).toISOString();
    setSkills(skills.map(skill => {
      if (skill.id !== skillId) return skill;
      
      const existingLogIndex = skill.logs.findIndex(l => l.date === dateStr);
      const newLogs = [...skill.logs];
      
      if (existingLogIndex >= 0) {
        if (hours === 0) {
          newLogs.splice(existingLogIndex, 1);
        } else {
          newLogs[existingLogIndex].hours = hours;
        }
      } else if (hours > 0) {
        newLogs.push({ date: dateStr, hours });
      }
      
      return { ...skill, logs: newLogs };
    }));
  };

  const filteredTasks = useMemo(() => {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    
    return tasks
      .filter(task => isSameDay(new Date(task.date), selectedDate))
      .sort((a, b) => {
        // First sort by completion status
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        // Then sort by priority
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      });
  }, [tasks, selectedDate]);

  const currentWeekTargets = useMemo(() => {
    const weekStart = startOfWeek(selectedDate);
    return weeklyTargets.filter(target => isSameWeek(new Date(target.week), weekStart));
  }, [weeklyTargets, selectedDate]);

  const currentMonthTargets = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    return monthlyTargets.filter(target => isSameMonth(new Date(target.month), monthStart));
  }, [monthlyTargets, selectedDate]);

  const streak = useMemo(() => {
    if (tasks.length === 0) return 0;

    const completedDates: number[] = Array.from(new Set<number>(
      tasks
        .filter(t => t.completed)
        .map(t => startOfDay(new Date(t.date)).getTime())
    )).sort((a: number, b: number) => b - a);

    if (completedDates.length === 0) return 0;

    const today = startOfDay(new Date()).getTime();
    const yesterday = subDays(new Date(today), 1).getTime();

    let currentStreak = 0;
    let lastDate = today;

    // Check if streak is active (completed today or yesterday)
    if (completedDates[0] !== today && completedDates[0] !== yesterday) {
      return 0;
    }

    // If the most recent completion was yesterday, start checking from yesterday
    if (completedDates[0] === yesterday && !completedDates.includes(today)) {
      lastDate = yesterday;
    }

    for (let i = 0; i < completedDates.length; i++) {
      const date = completedDates[i];
      const expectedDate = subDays(new Date(lastDate), currentStreak).getTime();

      if (date === expectedDate) {
        currentStreak++;
      } else {
        break;
      }
    }

    return currentStreak;
  }, [tasks]);

  const stats = useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter(t => t.completed).length;
    const pending = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pending, percentage };
  }, [filteredTasks]);

  const yearlyStats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearTasks = tasks.filter(t => new Date(t.date).getFullYear() === currentYear);
    const totalCompletions = yearTasks.filter(t => t.completed).length;
    const daysWithTasks = Array.from(new Set(yearTasks.map(t => startOfDay(new Date(t.date)).getTime()))).length;
    const avgPerDay = daysWithTasks > 0 ? (totalCompletions / daysWithTasks).toFixed(1) : 0;
    
    const dayCounts: Record<number, number> = {};
    yearTasks.filter(t => t.completed).forEach(t => {
      const d = startOfDay(new Date(t.date)).getTime();
      dayCounts[d] = (dayCounts[d] || 0) + 1;
    });
    
    let bestDayCount = 0;
    let bestDayDate = 0;
    Object.entries(dayCounts).forEach(([date, count]) => {
      if (count > bestDayCount) {
        bestDayCount = count;
        bestDayDate = parseInt(date);
      }
    });

    return { totalCompletions, avgPerDay, bestDayCount, bestDayDate };
  }, [tasks]);

  const momentumScore = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), i));
    const completionsLast7Days = tasks.filter(t => 
      t.completed && last7Days.some(d => isSameDay(new Date(t.date), d))
    ).length;
    
    // Score out of 100 based on a target of 5 tasks per day
    const target = 35; // 5 tasks * 7 days
    return Math.min(100, Math.round((completionsLast7Days / target) * 100));
  }, [tasks]);

  const weeklyMomentumData = useMemo(() => {
    const last8Weeks = [];
    const today = startOfWeek(new Date());
    for (let i = 7; i >= 0; i--) {
      const weekStart = subWeeks(today, i);
      const weekEnd = addDays(weekStart, 6);
      const weekTasks = tasks.filter(t => {
        const d = new Date(t.date);
        return d >= weekStart && d <= weekEnd;
      });
      const completed = weekTasks.filter(t => t.completed).length;
      last8Weeks.push({
        name: format(weekStart, 'MMM d'),
        completed
      });
    }
    return last8Weeks;
  }, [tasks]);

  const heatmapData = useMemo(() => {
    const today = new Date();
    const startDate = startOfWeek(startOfYear(today));
    const endDate = endOfWeek(endOfYear(today));
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return days.map(day => {
      const dayTasks = tasks.filter(t => isSameDay(new Date(t.date), day));
      const completedCount = dayTasks.filter(t => t.completed).length;
      
      let intensity = 0;
      if (completedCount > 0) intensity = 1;
      if (completedCount >= 3) intensity = 2;
      if (completedCount >= 5) intensity = 3;
      if (completedCount >= 8) intensity = 4;

      return {
        date: day,
        count: completedCount,
        intensity
      };
    });
  }, [tasks]);

  const heatmapWeeks = useMemo(() => {
    const weeks = [];
    for (let i = 0; i < heatmapData.length; i += 7) {
      weeks.push(heatmapData.slice(i, i + 7));
    }
    return weeks;
  }, [heatmapData]);

  const heatmapMonthLabels = useMemo(() => {
    const labels: { label: string; index: number }[] = [];
    heatmapWeeks.forEach((week, index) => {
      const firstDay = week[0].date;
      if (isSameDay(firstDay, startOfMonth(firstDay))) {
        labels.push({ label: format(firstDay, 'MMM'), index });
      } else if (index === 0) {
        labels.push({ label: format(firstDay, 'MMM'), index });
      } else {
        const prevWeekFirstDay = heatmapWeeks[index - 1][0].date;
        if (!isSameMonth(firstDay, prevWeekFirstDay)) {
          labels.push({ label: format(firstDay, 'MMM'), index });
        }
      }
    });
    return labels;
  }, [heatmapWeeks]);

  const chartData = useMemo(() => {
    if (stats.total === 0) {
      return [{ name: 'Empty', value: 1, color: 'rgba(255, 255, 255, 0.05)' }];
    }
    return [
      { name: 'Completed', value: stats.completed, color: '#10b981' },
      { name: 'Pending', value: stats.pending, color: 'rgba(255, 255, 255, 0.1)' },
    ];
  }, [stats]);

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    const newTask: Task = {
      id: crypto.randomUUID(),
      text: newTaskText.trim(),
      completed: false,
      priority: newPriority,
      createdAt: Date.now(),
      date: selectedDate.toISOString(),
    };

    setTasks([...tasks, newTask]);
    setNewTaskText('');
    setNewPriority('medium');
  };

  const addWeeklyTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeeklyTargetText.trim()) return;

    const newTarget: WeeklyTarget = {
      id: crypto.randomUUID(),
      text: newWeeklyTargetText.trim(),
      completed: false,
      week: startOfWeek(selectedDate).toISOString(),
    };

    setWeeklyTargets([...weeklyTargets, newTarget]);
    setNewWeeklyTargetText('');
  };

  const addMonthlyTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTargetText.trim()) return;

    const newTarget: MonthlyTarget = {
      id: crypto.randomUUID(),
      text: newTargetText.trim(),
      completed: false,
      month: startOfMonth(selectedDate).toISOString(),
    };

    setMonthlyTargets([...monthlyTargets, newTarget]);
    setNewTargetText('');
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const toggleWeeklyTarget = (id: string) => {
    setWeeklyTargets(weeklyTargets.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const toggleMonthlyTarget = (id: string) => {
    setMonthlyTargets(monthlyTargets.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    if (editingTask?.id === id) setEditingTask(null);
  };

  const updateTaskDetails = (updates: Partial<Task>) => {
    if (!editingTask) return;
    const updatedTasks = tasks.map(t => t.id === editingTask.id ? { ...t, ...updates } : t);
    setTasks(updatedTasks);
    setEditingTask({ ...editingTask, ...updates });
  };

  const addSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskText.trim() || !editingTask) return;
    const newSubtask: Subtask = {
      id: crypto.randomUUID(),
      text: newSubtaskText.trim(),
      completed: false
    };
    const updatedSubtasks = [...(editingTask.subtasks || []), newSubtask];
    updateTaskDetails({ subtasks: updatedSubtasks });
    setNewSubtaskText('');
  };

  const toggleSubtask = (subtaskId: string) => {
    if (!editingTask) return;
    const updatedSubtasks = editingTask.subtasks?.map(s => 
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    updateTaskDetails({ subtasks: updatedSubtasks });
  };

  const deleteSubtask = (subtaskId: string) => {
    if (!editingTask) return;
    const updatedSubtasks = editingTask.subtasks?.filter(s => s.id !== subtaskId);
    updateTaskDetails({ subtasks: updatedSubtasks });
  };

  const addLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkText.trim() || !editingTask) return;
    const updatedLinks = [...(editingTask.links || []), newLinkText.trim()];
    updateTaskDetails({ links: updatedLinks });
    setNewLinkText('');
  };

  const deleteLink = (index: number) => {
    if (!editingTask) return;
    const updatedLinks = editingTask.links?.filter((_, i) => i !== index);
    updateTaskDetails({ links: updatedLinks });
  };

  const deleteWeeklyTarget = (id: string) => {
    setWeeklyTargets(weeklyTargets.filter(t => t.id !== id));
  };

  const deleteMonthlyTarget = (id: string) => {
    setMonthlyTargets(monthlyTargets.filter(t => t.id !== id));
  };

  return (
    <div className="min-h-screen font-sans selection:bg-emerald-500/30 selection:text-emerald-200 relative">
      {/* Decorative background elements */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[10%] left-[5%] w-[40vw] h-[40vw] bg-emerald-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[5%] w-[30vw] h-[30vw] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-12 md:py-24 relative z-10">
        {/* Editorial Header */}
        <header className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-32 items-end">
          <div className="lg:col-span-8 space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4"
            >
              <div className="h-[1px] w-12 bg-emerald-500/40" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400/80">
                System Status: Operational
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.8 }}
            >
              <div className="space-y-2">
                <h1 className="text-[12vw] lg:text-[120px] font-bold leading-tight tracking-tight uppercase text-white">
                  Daily <span className="text-gradient font-serif italic font-normal normal-case tracking-normal inline-block pr-4">Pulse</span>
                </h1>
                <div className="flex items-center gap-6">
                  <p className="text-3xl lg:text-4xl font-serif italic text-slate-500">
                    {format(selectedDate, 'MMMM dd, yyyy')}
                  </p>
                  <div className="h-px w-24 bg-white/10" />
                  <p className="text-xs font-black uppercase tracking-[0.4em] text-emerald-500">
                    {format(selectedDate, 'EEEE')}
                  </p>
                </div>
              </div>

              <div className="mt-12 flex flex-wrap items-center gap-x-12 gap-y-6">
                <p className="text-slate-400 max-w-sm text-lg font-light leading-snug">
                  {stats.percentage === 100 
                    ? "Peak performance achieved. The day is yours." 
                    : stats.percentage > 50 
                    ? "Momentum is building. Finish strong." 
                    : stats.total > 0 
                    ? "Focus on the next step. Precision over speed." 
                    : "A clean slate for your greatest work."}
                </p>
                <div className="h-16 w-[1px] bg-white/10 hidden md:block" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Efficiency</span>
                  <span className="text-4xl font-bold text-white tracking-tighter">{stats.percentage}%</span>
                </div>
                <div className="h-16 w-[1px] bg-white/10 hidden md:block" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Momentum</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white tracking-tighter">{streak}</span>
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Days</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-4 flex justify-end">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center glass-card rounded-full p-2 pr-8 group glass-card-hover"
            >
              <button 
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                className="p-4 hover:bg-white/5 rounded-full transition-all text-slate-500 hover:text-white"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="px-8 flex flex-col items-center min-w-[160px]">
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-0.5">
                  Navigation
                </span>
                <span className="text-sm font-bold text-white tracking-tight">
                  {isSameDay(selectedDate, new Date()) ? 'Today' : format(selectedDate, 'MMM d')}
                </span>
              </div>

              <button 
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                className="p-4 hover:bg-white/5 rounded-full transition-all text-slate-500 hover:text-white"
              >
                <ChevronRight size={20} />
              </button>
            </motion.div>
          </div>
        </header>

        <main className="space-y-16">
          {/* Top Row: Manifesto & Capture */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-stretch">
            <div className="lg:col-span-5">
              {/* Resolution Section */}
              <section className="relative h-full">
                <div className="absolute -left-8 top-0 vertical-text text-[10px] font-black uppercase tracking-[0.3em] text-slate-700 h-full flex justify-center">
                  Manifesto
                </div>
                
                <div className="glass-card rounded-[3rem] p-10 relative overflow-hidden group glass-card-hover h-full">
                  <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-all duration-500">
                    <button 
                      onClick={() => {
                        setTempResolution(resolution);
                        setTempMotivation(motivation);
                        setIsEditingResolution(true);
                      }}
                      className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <Edit3 size={16} />
                    </button>
                  </div>

                  {isEditingResolution ? (
                    <div className="space-y-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">The Ultimate Goal</label>
                        <textarea
                          value={tempResolution}
                          onChange={(e) => setTempResolution(e.target.value)}
                          placeholder="What is your ultimate goal?"
                          className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-6 text-xl text-white placeholder:text-slate-800 outline-none focus:border-emerald-500/30 transition-all min-h-[120px] resize-none"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">The Deep Why</label>
                        <textarea
                          value={tempMotivation}
                          onChange={(e) => setTempMotivation(e.target.value)}
                          placeholder="Why does this matter to you?"
                          className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-6 text-sm text-slate-400 placeholder:text-slate-800 outline-none focus:border-emerald-500/30 transition-all min-h-[100px] resize-none"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={saveResolution}
                          className="flex-grow bg-emerald-500 text-black text-[11px] font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-emerald-400 transition-all glow-emerald"
                        >
                          Commit Manifesto
                        </button>
                        <button
                          onClick={() => setIsEditingResolution(false)}
                          className="px-8 bg-white/5 text-slate-400 text-[11px] font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-white/10 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                          <Target size={24} />
                        </div>
                        <div className="space-y-1">
                          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Resolution</h2>
                          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest italic">Your north star</p>
                        </div>
                      </div>

                      <div className="relative py-4">
                        <Quote className="absolute -left-4 -top-4 text-white/5" size={64} />
                        <p className="text-3xl font-bold text-white tracking-tight leading-tight relative z-10">
                          {resolution || "Define your ultimate resolution..."}
                        </p>
                      </div>

                      {motivation && (
                        <div className="pt-8 border-t border-white/5">
                          <p className="text-base text-slate-500 italic leading-relaxed font-serif">
                            "{motivation}"
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="lg:col-span-7">
              {/* Task Input Section */}
              <section className="relative h-full">
                <div className="absolute -left-12 top-0 vertical-text text-[10px] font-black uppercase tracking-[0.3em] text-slate-700 h-full flex justify-center">
                  Capture
                </div>
                
                <div className="glass-card rounded-[3.5rem] p-12 glass-card-hover h-full">
                  {!isSameDay(selectedDate, new Date()) ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-40">
                      <div className="w-20 h-20 rounded-[2.5rem] border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-700">
                        <AlertTriangle size={40} />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-bold tracking-tighter text-slate-500 uppercase">Archive Mode</h3>
                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">New missions can only be captured in real-time</p>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={addTask} className="space-y-10">
                      <div className="relative group">
                        <input
                          type="text"
                          value={newTaskText}
                          onChange={(e) => setNewTaskText(e.target.value)}
                          placeholder="What's the mission?"
                          className="w-full bg-transparent border-b-2 border-white/5 py-8 text-4xl md:text-5xl font-bold text-white placeholder:text-slate-800 focus:border-emerald-500/30 outline-none transition-all tracking-tighter"
                        />
                        <button
                          type="submit"
                          disabled={!newTaskText.trim()}
                          className="absolute right-0 bottom-8 p-6 bg-white text-black rounded-full hover:bg-emerald-400 hover:text-black disabled:opacity-10 transition-all duration-500 shadow-2xl glow-emerald"
                        >
                          <Plus size={32} />
                        </button>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-8 pt-4">
                        <div className="flex items-center gap-6">
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">Priority</span>
                          <div className="flex gap-3">
                            {(['low', 'medium', 'high'] as const).map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setNewPriority(p)}
                                className={cn(
                                  "px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border",
                                  newPriority === p 
                                    ? p === 'high' ? "bg-rose-500 text-black border-rose-500 glow-rose" 
                                      : p === 'medium' ? "bg-amber-500 text-black border-amber-500"
                                      : "bg-blue-500 text-black border-blue-500"
                                    : "bg-white/[0.02] text-slate-600 border-white/5 hover:border-white/10"
                                )}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              </section>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-stretch">
            {/* Left Column: Momentum & Metrics */}
            <aside className="lg:col-span-5 space-y-16">
              {/* Streak Card */}
              <section className="relative">
                <div className="absolute -left-8 top-0 vertical-text text-[10px] font-black uppercase tracking-[0.3em] text-slate-700 h-full flex justify-center">
                  Momentum
                </div>
                
                <div className="glass-card rounded-[3rem] p-10 relative overflow-hidden group glass-card-hover">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 blur-[80px] group-hover:bg-blue-500/20 transition-all duration-1000" />
                  
                  <div className="flex items-center justify-between mb-8">
                    <div className="space-y-1">
                      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Active Streak</h2>
                      <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest italic">Consistency is power</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400">
                      <TrendingUp size={24} />
                    </div>
                  </div>

                  <div className="flex items-baseline gap-4 mb-10">
                    <span className="text-8xl font-bold text-white tracking-tighter leading-none">{streak}</span>
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-blue-500 uppercase tracking-widest">Days</span>
                      <span className="text-[10px] font-bold text-slate-600 uppercase">Streak</span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-slate-500">Weekly Progress</span>
                      <span className="text-blue-400">{Math.round((streak / 7) * 100)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((streak / 7) * 100, 100)}%` }}
                        className="h-full bg-blue-500 glow-blue"
                      />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">
                      {streak === 0 ? "Start your journey today" : streak < 7 ? "Building the habit..." : streak < 30 ? "Unstoppable momentum" : "Legendary status"}
                    </p>
                  </div>
                </div>
              </section>

              {/* Performance Widget */}
              <section className="relative">
                <div className="absolute -left-8 top-0 vertical-text text-[10px] font-black uppercase tracking-[0.3em] text-slate-700 h-full flex justify-center">
                  Metrics
                </div>
                
                <div className="glass-card rounded-[3rem] p-8 relative overflow-hidden group glass-card-hover">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 blur-[80px] group-hover:bg-emerald-500/20 transition-all duration-1000" />
                  
                  <div className="flex items-center justify-between mb-10">
                    <div className="space-y-1">
                      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Daily Pulse</h2>
                      <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest italic">Real-time performance</p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                      <Activity size={24} />
                    </div>
                  </div>

                  <div className="h-[450px] w-full relative mb-10 flex items-center justify-center">
                    {/* Background Pulse Rings */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div 
                        animate={{ scale: [1, 1.05, 1], opacity: [0.1, 0.2, 0.1] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="w-[380px] h-[380px] rounded-full border border-emerald-500/10 absolute"
                      />
                      <div className="w-[320px] h-[320px] rounded-full border border-white/[0.05] bg-white/[0.01]" />
                    </div>
                    
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={130}
                          outerRadius={160}
                          paddingAngle={stats.total > 0 ? 4 : 0}
                          dataKey="value"
                          stroke="none"
                          startAngle={90}
                          endAngle={-270}
                          animationBegin={0}
                          animationDuration={1500}
                          animationEasing="ease-out"
                        >
                          {chartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.color} 
                              fillOpacity={stats.total === 0 ? 1 : 0.9}
                              className={cn(
                                entry.name === 'Completed' && "glow-emerald",
                                "transition-all duration-500 cursor-default outline-none"
                              )}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <motion.div
                        key={stats.percentage}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center"
                      >
                        <span className="text-9xl font-bold text-white tracking-tighter leading-none">
                          {stats.percentage}%
                        </span>
                        <div className="flex items-center gap-3 mt-8">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[12px] font-black uppercase tracking-[0.6em] text-emerald-500/80">
                            Efficiency
                          </span>
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-6 bg-white/5 rounded-[2rem] space-y-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Completed</span>
                      <p className="text-3xl font-bold text-white">{stats.completed}</p>
                    </div>
                    <div className="p-6 bg-white/5 rounded-[2rem] space-y-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Remaining</span>
                      <p className="text-3xl font-bold text-white">{stats.pending}</p>
                    </div>
                  </div>
                </div>
              </section>
            </aside>

            {/* Right Column: Objectives */}
            <div className="lg:col-span-7 relative">
              {/* Task List */}
              <section className="lg:absolute lg:inset-0 relative h-full">
                <div className="absolute -left-12 top-0 vertical-text text-[10px] font-black uppercase tracking-[0.3em] text-slate-700 h-full flex justify-center">
                  Objectives
                </div>
                
                <div className="glass-card rounded-[3.5rem] p-12 h-full flex flex-col glass-card-hover">
                  <div className="flex items-center justify-between mb-10">
                    <div className="space-y-1">
                      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Mission Control</h2>
                      <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest italic">Execute with precision</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                        {stats.completed}/{stats.total} Done
                      </div>
                    </div>
                  </div>

                  <div className="flex-grow overflow-y-auto no-scrollbar mask-fade-both pr-4 -mr-4 space-y-8 pb-10">
                    <AnimatePresence mode="popLayout">
                      {!isSameDay(selectedDate, new Date()) ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40"
                        >
                          <div className="w-16 h-16 rounded-full border border-slate-800 flex items-center justify-center text-slate-600">
                            <Clock size={32} />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-black uppercase tracking-widest text-slate-500">Historical View</p>
                            <p className="text-[10px] font-bold text-slate-700 uppercase tracking-tighter">Task details are hidden for privacy</p>
                          </div>
                        </motion.div>
                      ) : filteredTasks.length > 0 ? (
                        filteredTasks.map((task) => (
                          <motion.div
                            key={task.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={cn(
                              "group flex items-center gap-10 p-10 rounded-[3.5rem] transition-all border relative overflow-hidden",
                              task.completed 
                                ? "bg-white/[0.01] border-transparent opacity-40 grayscale-[0.5]" 
                                : cn(
                                    "glass-card glass-card-hover",
                                    task.priority === 'high' ? "border-rose-500/20 hover:border-rose-500/40" :
                                    task.priority === 'medium' ? "border-amber-500/20 hover:border-amber-500/40" :
                                    "border-blue-500/20 hover:border-blue-500/40"
                                  )
                            )}
                          >
                            {/* Priority Accent Line */}
                            {!task.completed && (
                              <div className={cn(
                                "absolute left-0 top-0 bottom-0 w-2",
                                task.priority === 'high' ? "bg-rose-500 glow-rose shadow-[0_0_30px_rgba(244,63,94,0.6)]" :
                                task.priority === 'medium' ? "bg-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.6)]" :
                                "bg-blue-500 glow-blue shadow-[0_0_30px_rgba(59,130,246,0.6)]"
                              )} />
                            )}

                            <button
                              onClick={() => toggleTask(task.id)}
                              className={cn(
                                "flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2",
                                task.completed 
                                  ? "bg-emerald-500 border-emerald-500 text-black glow-emerald" 
                                  : task.priority === 'high' ? "text-rose-500/40 hover:text-rose-500" :
                                    task.priority === 'medium' ? "text-amber-500/40 hover:text-amber-500" :
                                    "text-blue-500/40 hover:text-blue-500"
                              )}
                            >
                              {task.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                            </button>

                            <div 
                              className="flex-grow space-y-2 cursor-pointer"
                              onClick={() => setEditingTask(task)}
                            >
                              <div className="flex items-center gap-4">
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-[0.3em]",
                                  task.priority === 'high' ? "text-rose-500" :
                                  task.priority === 'medium' ? "text-amber-500" :
                                  "text-blue-500"
                                )}>
                                  {task.priority}
                                </span>
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">
                                  {format(new Date(task.date), 'MMMM d')}
                                </span>
                              </div>
                              <h3 
                                className={cn(
                                  "text-3xl font-bold tracking-tighter transition-all leading-tight",
                                  task.completed ? "text-slate-500 line-through" : "text-white group-hover:text-emerald-400"
                                )}
                              >
                                {task.text}
                              </h3>
                              
                              <div className="flex items-center gap-3 pt-2">
                                {task.notes && (
                                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500/60">
                                    • Has Notes
                                  </span>
                                )}
                                {(task.subtasks?.length ?? 0) > 0 && (
                                  <span className="text-[9px] font-black uppercase tracking-widest text-blue-500/60">
                                    • {task.subtasks?.filter(s => s.completed).length}/{task.subtasks?.length} Subtasks
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                              <button 
                                onClick={() => setEditingTask(task)}
                                className="p-4 bg-white/5 text-slate-500 hover:text-white hover:bg-white/10 rounded-2xl transition-all"
                              >
                                <Edit3 size={20} />
                              </button>
                              <button 
                                onClick={() => deleteTask(task.id)}
                                className="p-4 bg-white/5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all"
                              >
                                <Trash2 size={20} />
                              </button>
                            </div>
                          </motion.div>
                        ))
                      ) : (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="py-48 flex flex-col items-center justify-center text-slate-800"
                        >
                          <div className="w-48 h-48 rounded-[4rem] border-2 border-dashed border-white/5 flex items-center justify-center mb-12 rotate-12">
                            <Clock size={80} className="opacity-10" />
                          </div>
                          <h3 className="text-4xl font-bold tracking-tighter text-slate-600">Silence is potential.</h3>
                          <p className="text-xs font-black opacity-40 mt-4 uppercase tracking-[0.5em]">Define your next move</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </section>
            </div>

          </div>

          {/* New Row: Weekly & Monthly Focus */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mt-16">
            {/* Weekly Focus */}
            <section className="relative">
              <div className="absolute -left-8 top-0 vertical-text text-[10px] font-black uppercase tracking-[0.3em] text-slate-700 h-full flex justify-center">
                Weekly
              </div>
              
              <div className="glass-card rounded-[3rem] p-10 glass-card-hover">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                    Week Targets
                  </h2>
                  <span className="text-[10px] font-mono text-blue-500/60">
                    {currentWeekTargets.filter(t => t.completed).length}/{currentWeekTargets.length}
                  </span>
                </div>

                {/* Weekly Progress Bar */}
                <div className="mb-8 space-y-2">
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${currentWeekTargets.length > 0 ? (currentWeekTargets.filter(t => t.completed).length / currentWeekTargets.length) * 100 : 0}%` }}
                      className="h-full bg-blue-500"
                    />
                  </div>
                </div>

                <form onSubmit={addWeeklyTarget} className="relative mb-10">
                  <input
                    type="text"
                    value={newWeeklyTargetText}
                    onChange={(e) => setNewWeeklyTargetText(e.target.value)}
                    placeholder="Set a weekly goal..."
                    className="w-full bg-white/5 border-b border-white/10 py-4 pr-12 focus:border-blue-500/50 outline-none transition-all text-sm text-slate-200 placeholder:text-slate-700 font-medium"
                  />
                  <button
                    type="submit"
                    disabled={!newWeeklyTargetText.trim()}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-400 disabled:opacity-20 transition-all"
                  >
                    <Plus size={24} />
                  </button>
                </form>

                <div className="space-y-4 max-h-[250px] overflow-y-auto no-scrollbar pr-2">
                  <AnimatePresence mode="popLayout">
                    {currentWeekTargets.map((target) => (
                      <motion.div
                        key={target.id}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="group flex items-start gap-4"
                      >
                        <button
                          onClick={() => toggleWeeklyTarget(target.id)}
                          className={cn(
                            "mt-1 transition-all duration-300",
                            target.completed ? "text-blue-500" : "text-slate-700 hover:text-blue-500"
                          )}
                        >
                          {target.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                        </button>
                        <span className={cn(
                          "flex-grow text-sm leading-relaxed transition-all duration-500",
                          target.completed ? "text-slate-600 line-through" : "text-slate-300"
                        )}>
                          {target.text}
                        </span>
                        <button
                          onClick={() => deleteWeeklyTarget(target.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-rose-500 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </section>

            {/* Monthly Focus */}
            <section className="relative">
              <div className="absolute -left-8 top-0 vertical-text text-[10px] font-black uppercase tracking-[0.3em] text-slate-700 h-full flex justify-center">
                Focus
              </div>
              
              <div className="glass-card rounded-[3rem] p-10 glass-card-hover">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                    {format(selectedDate, 'MMMM')} Targets
                  </h2>
                  <span className="text-[10px] font-mono text-emerald-500/60">
                    {currentMonthTargets.filter(t => t.completed).length}/{currentMonthTargets.length}
                  </span>
                </div>

                {/* Monthly Progress Bar */}
                <div className="mb-8 space-y-2">
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${currentMonthTargets.length > 0 ? (currentMonthTargets.filter(t => t.completed).length / currentMonthTargets.length) * 100 : 0}%` }}
                      className="h-full bg-emerald-500"
                    />
                  </div>
                </div>

                <form onSubmit={addMonthlyTarget} className="relative mb-10">
                  <input
                    type="text"
                    value={newTargetText}
                    onChange={(e) => setNewTargetText(e.target.value)}
                    placeholder="Define a monthly goal..."
                    className="w-full bg-white/5 border-b border-white/10 py-4 pr-12 focus:border-emerald-500/50 outline-none transition-all text-sm text-slate-200 placeholder:text-slate-700 font-medium"
                  />
                  <button
                    type="submit"
                    disabled={!newTargetText.trim()}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-emerald-500 hover:text-emerald-400 disabled:opacity-20 transition-all"
                  >
                    <Plus size={24} />
                  </button>
                </form>

                <div className="space-y-4 max-h-[250px] overflow-y-auto no-scrollbar pr-2">
                  <AnimatePresence mode="popLayout">
                    {currentMonthTargets.map((target) => (
                      <motion.div
                        key={target.id}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="group flex items-start gap-4"
                      >
                        <button
                          onClick={() => toggleMonthlyTarget(target.id)}
                          className={cn(
                            "mt-1 transition-all duration-300",
                            target.completed ? "text-emerald-500" : "text-slate-700 hover:text-emerald-500"
                          )}
                        >
                          {target.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                        </button>
                        <span className={cn(
                          "flex-grow text-sm leading-relaxed transition-all duration-500",
                          target.completed ? "text-slate-600 line-through" : "text-slate-300"
                        )}>
                          {target.text}
                        </span>
                        <button
                          onClick={() => deleteMonthlyTarget(target.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-rose-500 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </section>
          </div>


      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="lg:col-span-12">
          {/* Pulse Heatmap & Momentum Trends */}
          <section className="relative">
              <div className="absolute -left-12 top-0 vertical-text text-[10px] font-black uppercase tracking-[0.3em] text-slate-700 h-full flex justify-center">
                History
              </div>
              
              <div className="glass-card rounded-[3.5rem] p-12 overflow-hidden glass-card-hover">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-16">
                  {/* Left Side: Heatmap */}
                  <div className="xl:col-span-8 space-y-12">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Activity Pulse</h2>
                        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest italic">Last 52 weeks of momentum</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] text-slate-800 font-black uppercase tracking-widest">Less</span>
                        <div className="flex gap-2">
                          {[0, 1, 2, 3, 4].map(i => (
                            <div key={i} className={cn(
                              "w-5 h-5 rounded-[4px]",
                              i === 0 && "bg-white/[0.02]",
                              i === 1 && "bg-emerald-500/20",
                              i === 2 && "bg-emerald-500/40",
                              i === 3 && "bg-emerald-500/70",
                              i === 4 && "bg-emerald-500 glow-emerald"
                            )} />
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-800 font-black uppercase tracking-widest">More</span>
                      </div>
                    </div>
                    
                    <div className="relative overflow-x-auto no-scrollbar pb-6">
                      <div className="flex flex-col gap-3 min-w-max">
                        <div className="flex">
                          {/* The Grid */}
                          <div className="flex gap-1.5">
                            {heatmapWeeks.map((week, wIdx) => (
                              <div key={wIdx} className="flex flex-col gap-1.5">
                                {week.map((day, dIdx) => (
                                  <motion.button
                                    key={dIdx}
                                    whileHover={{ scale: 1.4, zIndex: 10 }}
                                    onClick={() => setSelectedDate(day.date)}
                                    className={cn(
                                      "w-5 h-5 rounded-[4px] transition-all relative group",
                                      day.intensity === 0 && "bg-white/[0.03]",
                                      day.intensity === 1 && "bg-emerald-500/20",
                                      day.intensity === 2 && "bg-emerald-500/40",
                                      day.intensity === 3 && "bg-emerald-500/70",
                                      day.intensity === 4 && "bg-emerald-500 glow-emerald",
                                      isSameDay(day.date, selectedDate) && "ring-2 ring-white ring-offset-4 ring-offset-[#050505]"
                                    )}
                                  >
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-white text-black text-[10px] font-black rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all shadow-2xl whitespace-nowrap z-50">
                                      {format(day.date, 'MMM d, yyyy')} • {day.count} tasks
                                    </div>
                                  </motion.button>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Stats & Trends */}
                  <div className="xl:col-span-4 flex flex-col gap-12 border-l border-white/5 pl-12">
                    <div className="space-y-8">
                      <div className="space-y-1">
                        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Momentum Trends</h2>
                        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest italic">Weekly completion velocity</p>
                      </div>
                      
                      <div className="h-32 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={weeklyMomentumData}>
                            <Bar 
                              dataKey="completed" 
                              fill="#10b981" 
                              radius={[4, 4, 0, 0]}
                              opacity={0.8}
                            />
                            <Tooltip 
                              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-white px-3 py-1.5 rounded-lg shadow-2xl">
                                      <p className="text-[10px] font-black uppercase text-black">
                                        {payload[0].payload.name}: {payload[0].value} tasks
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-8 gap-y-12 pt-8 border-t border-white/5">
                      <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-700">Momentum</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-5xl font-light tracking-tighter text-emerald-500 leading-none">{momentumScore}</p>
                          <span className="text-[10px] font-black text-slate-800 uppercase">/ 100</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-700">Total Done</p>
                        <p className="text-5xl font-light tracking-tighter text-white leading-none">{yearlyStats.totalCompletions}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-700">Daily Avg</p>
                        <p className="text-5xl font-light tracking-tighter text-white leading-none">{yearlyStats.avgPerDay}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-700">Best Day</p>
                        <p className="text-5xl font-light tracking-tighter text-white leading-none">{yearlyStats.bestDayCount}</p>
                      </div>
                    <div className="col-span-2 pt-4 border-t border-white/5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-700 mb-1">Peak Performance Date</p>
                      <p className="text-sm font-bold tracking-tighter text-slate-400 uppercase">
                        {yearlyStats.bestDayDate ? format(new Date(yearlyStats.bestDayDate), 'MMMM d, yyyy') : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

        {/* Skill Mastery Section */}
            <section className="relative">
              <div className="absolute -left-12 top-0 vertical-text text-[10px] font-black uppercase tracking-[0.3em] text-slate-700 h-full flex justify-center">
                Mastery
              </div>

              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tighter text-white">Skill Mastery</h2>
                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Track your deliberate practice</p>
                  </div>
                  <button 
                    onClick={() => setIsAddingSkill(true)}
                    className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all group"
                  >
                    <Plus size={24} className={cn("transition-transform", isAddingSkill && "rotate-45")} />
                  </button>
                </div>

                {isAddingSkill && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-[2.5rem] p-8 flex gap-4 items-center"
                  >
                    <input 
                      type="text"
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                      placeholder="Enter skill name (e.g., Piano, Coding, Chess)..."
                      className="flex-grow bg-transparent border-b border-white/10 py-2 outline-none text-white font-bold tracking-tight placeholder:text-slate-800"
                      onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                      autoFocus
                    />
                    <button 
                      onClick={addSkill}
                      className="px-6 py-2 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-colors"
                    >
                      Add Skill
                    </button>
                  </motion.div>
                )}

                <div className="space-y-12">
                  {skills.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-800 glass-card rounded-[3.5rem] border-dashed border-2 border-white/5">
                      <Target size={48} className="opacity-10 mb-6" />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em]">No skills tracked yet</p>
                    </div>
                  ) : (
                    skills.map((skill) => {
                      const today = startOfDay(new Date());
                      const startDate = subWeeks(startOfWeek(today), 51);
                      const days = eachDayOfInterval({ start: startDate, end: today });
                      
                      const skillHeatmapData = days.map(day => {
                        const log = skill.logs.find(l => isSameDay(new Date(l.date), day));
                        const hours = log ? log.hours : 0;
                        
                        let intensity = 0;
                        if (hours > 0) intensity = 1;
                        if (hours >= 1) intensity = 2;
                        if (hours >= 3) intensity = 3;
                        if (hours >= 5) intensity = 4;

                        return { date: day, hours, intensity };
                      });

                      const skillWeeks = [];
                      for (let i = 0; i < skillHeatmapData.length; i += 7) {
                        skillWeeks.push(skillHeatmapData.slice(i, i + 7));
                      }

                      const currentDayLog = skill.logs.find(l => isSameDay(new Date(l.date), selectedDate));
                      const currentHours = currentDayLog ? currentDayLog.hours : 0;

                      return (
                        <div key={skill.id} className="glass-card rounded-[3.5rem] p-10 space-y-8 glass-card-hover group">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-emerald-500 glow-emerald">
                                <Activity size={24} />
                              </div>
                              <div>
                                <h3 className="text-2xl font-bold tracking-tighter text-white">{skill.name}</h3>
                                <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">
                                  {skill.logs.reduce((acc, curr) => acc + curr.hours, 0)} Total Hours
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2 bg-white/5 rounded-2xl p-2 pr-4 border border-white/5">
                                <input 
                                  type="number"
                                  min="0"
                                  max="24"
                                  step="0.5"
                                  value={currentHours || ''}
                                  onChange={(e) => logSkillHours(skill.id, selectedDate, parseFloat(e.target.value) || 0)}
                                  placeholder="Hrs"
                                  className="w-16 bg-transparent text-center text-white font-bold outline-none placeholder:text-slate-800"
                                />
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Hrs Today</span>
                              </div>
                              <button 
                                onClick={() => deleteSkill(skill.id)}
                                className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-black transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          <div className="relative overflow-x-auto no-scrollbar">
                            <div className="flex gap-1.5 min-w-max">
                              {skillWeeks.map((week, wIdx) => (
                                <div key={wIdx} className="flex flex-col gap-1.5">
                                  {week.map((day, dIdx) => (
                                    <motion.button
                                      key={dIdx}
                                      whileHover={{ scale: 1.4, zIndex: 10 }}
                                      onClick={() => setSelectedDate(day.date)}
                                      className={cn(
                                        "w-4 h-4 rounded-[3px] transition-all relative group/cell",
                                        day.intensity === 0 && "bg-white/[0.02]",
                                        day.intensity === 1 && "bg-emerald-500/20",
                                        day.intensity === 2 && "bg-emerald-500/40",
                                        day.intensity === 3 && "bg-emerald-500/70",
                                        day.intensity === 4 && "bg-emerald-500 glow-emerald",
                                        isSameDay(day.date, selectedDate) && "ring-1 ring-white ring-offset-2 ring-offset-[#050505]"
                                      )}
                                    >
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-white text-black text-[8px] font-black rounded-md opacity-0 group-hover/cell:opacity-100 pointer-events-none transition-all shadow-xl whitespace-nowrap z-50">
                                        {format(day.date, 'MMM d')} • {day.hours}h
                                      </div>
                                    </motion.button>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </section>
          </main>

          <footer className="mt-40 pb-20 border-t border-white/5 pt-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-6">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-700">Daily Pulse v2.0</span>
            <div className="h-4 w-[1px] bg-white/10" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-700">Editorial Edition</span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800">
            Crafted for peak human performance
          </p>
        </footer>
      </div>

      {/* Task Detail Modal */}
      <AnimatePresence>
        {editingTask && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingTask(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 40 }}
              className="relative w-full max-w-2xl glass-card rounded-[4rem] overflow-hidden flex flex-col max-h-[90vh] border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)]"
            >
              <div className="p-16 overflow-y-auto no-scrollbar space-y-16">
                <header className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className={cn(
                        "px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border",
                        editingTask.priority === 'high' ? "bg-rose-500/10 text-rose-400 border-rose-500/30" :
                        editingTask.priority === 'medium' ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                        "bg-blue-500/10 text-blue-400 border-blue-500/30"
                      )}>
                        {editingTask.priority} Priority
                      </span>
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                        {format(new Date(editingTask.date), 'MMMM d, yyyy')}
                      </span>
                    </div>
                    <button 
                      onClick={() => setEditingTask(null)}
                      className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all group"
                    >
                      <Plus size={24} className="rotate-45 group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                  <h2 className="text-5xl font-bold tracking-tighter text-white leading-[1.1] text-gradient">
                    {editingTask.text}
                  </h2>
                </header>

                {!isSameDay(new Date(editingTask.date), new Date()) ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center space-y-6 opacity-40 border-2 border-dashed border-white/5 rounded-[3rem]">
                    <Clock size={48} className="text-slate-700" />
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold tracking-tighter text-slate-500 uppercase">Historical Record</h3>
                      <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">This task is locked for historical integrity</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Notes Section */}
                    <section className="space-y-6">
                  <div className="flex items-center gap-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">The Context</h3>
                    <div className="h-[1px] flex-grow bg-white/5" />
                  </div>
                  <textarea
                    value={editingTask.notes || ''}
                    onChange={(e) => updateTaskDetails({ notes: e.target.value })}
                    placeholder="Add detailed notes here..."
                    className="w-full bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10 text-lg text-slate-300 placeholder:text-slate-800 focus:border-emerald-500/20 focus:bg-white/[0.04] outline-none transition-all min-h-[200px] resize-none leading-relaxed"
                  />
                </section>

                {/* Subtasks Section */}
                <section className="space-y-8">
                  <div className="flex items-center gap-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">The Breakdown</h3>
                    <div className="h-[1px] flex-grow bg-white/5" />
                  </div>
                  <form onSubmit={addSubtask} className="relative group">
                    <input
                      type="text"
                      value={newSubtaskText}
                      onChange={(e) => setNewSubtaskText(e.target.value)}
                      placeholder="Add a subtask..."
                      className="w-full bg-transparent border-b-2 border-white/5 py-6 pr-16 focus:border-blue-500/40 outline-none transition-all text-xl text-slate-200 placeholder:text-slate-800 font-bold tracking-tight"
                    />
                    <button
                      type="submit"
                      disabled={!newSubtaskText.trim()}
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-black disabled:opacity-10 transition-all flex items-center justify-center"
                    >
                      <Plus size={24} />
                    </button>
                  </form>
                  <div className="space-y-4">
                    {editingTask.subtasks?.map((subtask) => (
                      <div key={subtask.id} className="group flex items-center gap-6 p-6 rounded-[2rem] bg-white/[0.01] border border-white/5 hover:bg-white/[0.03] hover:border-white/10 transition-all">
                        <button
                          onClick={() => toggleSubtask(subtask.id)}
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 border-2",
                            subtask.completed 
                              ? "bg-blue-500 border-blue-500 text-black glow-blue" 
                              : "text-slate-700 border-slate-800 hover:border-blue-500/50 hover:text-blue-500"
                          )}
                        >
                          {subtask.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                        </button>
                        <span className={cn(
                          "flex-grow text-lg font-medium transition-all duration-500",
                          subtask.completed ? "text-slate-600 line-through" : "text-slate-300"
                        )}>
                          {subtask.text}
                        </span>
                        <button
                          onClick={() => deleteSubtask(subtask.id)}
                          className="opacity-0 group-hover:opacity-100 w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-black transition-all flex items-center justify-center"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Links/Attachments Section */}
                <section className="space-y-8">
                  <div className="flex items-center gap-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">The Resources</h3>
                    <div className="h-[1px] flex-grow bg-white/5" />
                  </div>
                  <form onSubmit={addLink} className="relative group">
                    <input
                      type="text"
                      value={newLinkText}
                      onChange={(e) => setNewLinkText(e.target.value)}
                      placeholder="Add a URL or link..."
                      className="w-full bg-transparent border-b-2 border-white/5 py-6 pr-16 focus:border-emerald-500/40 outline-none transition-all text-xl text-slate-200 placeholder:text-slate-800 font-bold tracking-tight"
                    />
                    <button
                      type="submit"
                      disabled={!newLinkText.trim()}
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-black disabled:opacity-10 transition-all flex items-center justify-center"
                    >
                      <Plus size={24} />
                    </button>
                  </form>
                  <div className="space-y-4">
                    {editingTask.links?.map((link, index) => (
                      <div key={index} className="group flex items-center gap-6 p-6 rounded-[2rem] bg-white/[0.01] border border-white/5 hover:bg-white/[0.03] hover:border-white/10 transition-all">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                          <TrendingUp size={20} />
                        </div>
                        <a 
                          href={link.startsWith('http') ? link : `https://${link}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex-grow text-lg font-medium text-slate-300 hover:text-emerald-400 transition-colors truncate"
                        >
                          {link}
                        </a>
                        <button
                          onClick={() => deleteLink(index)}
                          className="opacity-0 group-hover:opacity-100 w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-black transition-all flex items-center justify-center"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
    </div>
  );
}
