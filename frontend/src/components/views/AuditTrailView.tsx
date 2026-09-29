import React, { useState } from 'react';
import {
  History,
  Bot,
  User,
  Shield,
  Download,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Hash,
  Search,
  FileSpreadsheet,
  Plus,
} from 'lucide-react';
import { useOilShield } from '../../context/OilShieldContext';
import { AuditEvent } from '../../types/oilshield';
import { StatusBadge } from '../common/StatusBadge';
import { FormModal, Field, TextInput, TextArea } from '../common/FormModal';

export const AuditTrailView: React.FC = () => {
  const { auditLogs, setCurrentView, selectedIncident, addManualAuditEntry } = useOilShield();

  const [actorFilter, setActorFilter] = useState<'ALL' | 'AI_AGENT' | 'HUMAN_OPERATOR' | 'SYSTEM_MONITOR'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Log Entry modal state
  const [isLogEntryOpen, setIsLogEntryOpen] = useState(false);
  const [entryEvent, setEntryEvent] = useState('');
  const [entryDetails, setEntryDetails] = useState('');

  const resetLogEntryForm = () => {
    setEntryEvent('');
    setEntryDetails('');
  };

  const handleLogEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addManualAuditEntry({
      event: entryEvent,
      details: entryDetails,
    });
    resetLogEntryForm();
    setIsLogEntryOpen(false);
  };

  const filteredLogs = auditLogs.filter((log) => {
    const matchesActor = actorFilter === 'ALL' || log.actorType === actorFilter;
    const matchesSearch =
      log.event.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.verificationHash.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesActor && matchesSearch;
  });

  const handleExportCsv = () => {
    const headers = ['Timestamp', 'Event', 'Actor Type', 'Actor Name', 'Role', 'Incident ID', 'Status', 'Details', 'Hash'];
    const rows = filteredLogs.map((l) => [
      l.timestamp,
      `"${l.event}"`,
      l.actorType,
      `"${l.actorName}"`,
      `"${l.actorRole}"`,
      l.incidentId,
      l.status,
      `"${l.details.replace(/"/g, '""')}"`,
      l.verificationHash,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `oilshield_audit_${selectedIncident.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Audit Trail
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-primary-soft text-accent-strong border border-primary-border text-xs font-bold font-mono">
              Immutable Records
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Chronological record of operational assessments and human authorizations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLogEntryOpen(true)}
            className="px-3.5 py-2 bg-primary hover:bg-primary-strong text-ink rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Entry</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setCurrentView('decisions')}
            className="px-4 py-2 bg-primary hover:bg-primary-strong text-ink rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-2"
          >
            <span>Decision Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search events, actors, hashes, or decision notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent/20"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-medium">Filter Actor:</span>
          {[
            { id: 'ALL', label: 'All Events' },
            { id: 'AI_AGENT', label: 'AI Agents Only' },
            { id: 'HUMAN_OPERATOR', label: 'Human Actions Only' },
            { id: 'SYSTEM_MONITOR', label: 'System Telemetry' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActorFilter(tab.id as any)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                actorFilter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chronological Timeline Stream */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2 sm:before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          {filteredLogs.map((log) => {
            const isHuman = log.actorType === 'HUMAN_OPERATOR';
            const isAi = log.actorType === 'AI_AGENT';

            return (
              <div key={log.id} className="relative group">
                {/* Timeline node icon */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-1 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-white ${
                    isHuman
                      ? 'bg-success text-white'
                      : isAi
                      ? 'bg-primary text-ink'
                      : 'bg-slate-700 text-white'
                  }`}
                >
                  {isHuman ? (
                    <User className="w-3 h-3" />
                  ) : isAi ? (
                    <Bot className="w-3 h-3" />
                  ) : (
                    <Clock className="w-3 h-3" />
                  )}
                </div>

                {/* Event Card */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    isHuman
                      ? 'bg-success-soft/60 border-success/40 shadow-xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200/60 pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {log.timeFormatted}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isHuman
                            ? 'bg-success-soft text-success border border-success/30'
                            : isAi
                            ? 'bg-slate-100 text-slate-800 border border-slate-200'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isHuman ? 'HUMAN DECISION' : isAi ? 'AI AGENT' : 'SYSTEM TELEMETRY'}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                        {log.incidentId}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-800">
                        {log.actorName}
                      </span>
                      <span className="text-slate-400">({log.actorRole})</span>
                    </div>
                  </div>

                  <h4 className="font-bold text-sm text-slate-900 leading-snug">
                    {log.event}
                  </h4>

                  <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                    {log.details}
                  </p>

                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3 text-slate-400" />
                      <span>Hash: {log.verificationHash}</span>
                    </span>
                    <span className="text-success font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Immutable Verified
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Log Entry Modal */}
      {isLogEntryOpen && (
        <FormModal
          title="Log Entry"
          subtitle="Append a free-text manual audit entry, e.g. a phone call or external coordination note."
          onClose={() => {
            resetLogEntryForm();
            setIsLogEntryOpen(false);
          }}
          onSubmit={handleLogEntrySubmit}
          submitLabel="Log Entry"
        >
          <Field label="Event" required>
            <TextInput
              value={entryEvent}
              onChange={(e) => setEntryEvent(e.target.value)}
              placeholder="Coordination Call with Port Authority"
              required
            />
          </Field>
          <Field label="Details" required>
            <TextArea
              value={entryDetails}
              onChange={(e) => setEntryDetails(e.target.value)}
              rows={4}
              required
            />
          </Field>
        </FormModal>
      )}
    </div>
  );
};
