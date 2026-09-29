import React, { useState } from 'react';
import {
  Building2,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowRight,
  Shield,
  Layers,
  Flame,
  Info,
  SlidersHorizontal,
  Plus,
} from 'lucide-react';
import { useOilShield } from '../../context/OilShieldContext';
import { CrudeSupplier } from '../../types/oilshield';
import { StatusBadge } from '../common/StatusBadge';
import { FormModal, Field, TextInput, TextArea, Select, FieldRow } from '../common/FormModal';

export const SupplierIntelligenceView: React.FC = () => {
  const { suppliers, setCurrentView, selectedIncident, addSupplier } = useOilShield();

  const [searchFilter, setSearchFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');
  const [minQuantity, setMinQuantity] = useState<number>(0);
  const [maxLeadTime, setMaxLeadTime] = useState<number>(48);
  const [selectedSupplier, setSelectedSupplier] = useState<CrudeSupplier | null>(null);

  // Add Supplier modal state
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [supName, setSupName] = useState('');
  const [supLocation, setSupLocation] = useState('');
  const [supCountry, setSupCountry] = useState('');
  const [supCrudeGrade, setSupCrudeGrade] = useState('');
  const [supApiGravity, setSupApiGravity] = useState(0);
  const [supSulfurContentPct, setSupSulfurContentPct] = useState(0);
  const [supAvailableQuantityBarrels, setSupAvailableQuantityBarrels] = useState(0);
  const [supLeadTimeHours, setSupLeadTimeHours] = useState(0);
  const [supReliabilityScorePct, setSupReliabilityScorePct] = useState(0);
  const [supEstimatedCostPerBbl, setSupEstimatedCostPerBbl] = useState(0);
  const [supCompatibilityPct, setSupCompatibilityPct] = useState(0);
  const [supPortAccess, setSupPortAccess] = useState('');
  const [supContractType, setSupContractType] = useState<CrudeSupplier['contractType']>('Framework Agreement');
  const [supComplianceNotes, setSupComplianceNotes] = useState('');

  const resetAddSupplierForm = () => {
    setSupName('');
    setSupLocation('');
    setSupCountry('');
    setSupCrudeGrade('');
    setSupApiGravity(0);
    setSupSulfurContentPct(0);
    setSupAvailableQuantityBarrels(0);
    setSupLeadTimeHours(0);
    setSupReliabilityScorePct(0);
    setSupEstimatedCostPerBbl(0);
    setSupCompatibilityPct(0);
    setSupPortAccess('');
    setSupContractType('Framework Agreement');
    setSupComplianceNotes('');
  };

  const handleAddSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addSupplier({
      name: supName,
      location: supLocation,
      country: supCountry,
      crudeGrade: supCrudeGrade,
      apiGravity: supApiGravity,
      sulfurContentPct: supSulfurContentPct,
      availableQuantityBarrels: supAvailableQuantityBarrels,
      leadTimeHours: supLeadTimeHours,
      reliabilityScorePct: supReliabilityScorePct,
      estimatedCostPerBbl: supEstimatedCostPerBbl,
      compatibilityPct: supCompatibilityPct,
      portAccess: supPortAccess,
      contractType: supContractType,
      complianceNotes: supComplianceNotes,
    });
    resetAddSupplierForm();
    setIsAddSupplierOpen(false);
  };

  const filteredSuppliers = suppliers.filter((sup) => {
    const matchesSearch =
      sup.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      sup.crudeGrade.toLowerCase().includes(searchFilter.toLowerCase()) ||
      sup.location.toLowerCase().includes(searchFilter.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || sup.approvalStatus === statusFilter;

    const matchesGrade =
      gradeFilter === 'ALL' || sup.crudeGrade.toLowerCase().includes(gradeFilter.toLowerCase());

    const matchesQuantity = sup.availableQuantityBarrels >= minQuantity;

    const matchesLeadTime = sup.leadTimeHours <= maxLeadTime;

    return matchesSearch && matchesStatus && matchesGrade && matchesQuantity && matchesLeadTime;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Supplier Intelligence & Sourcing
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-primary-soft text-accent-strong border border-primary-border text-xs font-bold font-mono">
              Agent 2 Sourcing Evaluation
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Searches approved SAP vendor master records for alternative crude sources with matching API gravity, sulfur specs, and lead times.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddSupplierOpen(true)}
            className="px-4 py-2 bg-primary hover:bg-primary-strong text-ink rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Supplier</span>
          </button>
          <button
            onClick={() => setCurrentView('scenarios')}
            className="px-4 py-2 bg-primary hover:bg-primary-strong text-ink rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
          >
            <span>Proceed to Recovery Scenarios</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Agent 2 Intelligence Banner & Governance Rule */}
      <div className="p-4 bg-primary-soft/60 border border-primary-border/80 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-primary text-ink rounded-xl flex-shrink-0">
            <Building2 className="w-5 h-5" />
          </span>
          <div className="text-xs text-slate-800">
            <div className="font-bold text-sm text-slate-900">
              Agent 2 Sourcing Assessment for {selectedIncident.id} (Arab Light Crude 20,000 bbl)
            </div>
            <div className="text-slate-600 mt-0.5">
              Identified 2 Approved suppliers (Supplier A — Saudi Aramco contracted, Supplier B — ADNOC spot framework), 1 Pending Review (Supplier C — Basrah heavy crude), and 1 Restricted broker (Supplier D — OFAC sanction block).
            </div>
            <div className="text-accent-strong font-semibold mt-1">
              ⚖ Governance Rule Enforced: Agent 2 does not automatically select a supplier. Sourcing options are presented for human procurement review.
            </div>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <span className="text-xs font-mono font-bold text-success bg-success-soft px-2.5 py-1 rounded-md">
            Sourcing Compatibility: 99.2%
          </span>
        </div>
      </div>

      {/* Filter and Search Bar (Filters for Crude Grade, Availability, Lead Time, Approval Status) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by supplier name, crude grade, or port..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent/20"
            />
          </div>

          {/* Status filter buttons */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Status:</span>
            {['ALL', 'APPROVED', 'PENDING_REVIEW', 'RESTRICTED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? 'All' : st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Second Row of Filters: Crude Grade, Min Availability, Max Lead Time */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
          {/* Crude Grade Filter */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Crude Grade:</span>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium focus:outline-hidden focus:border-accent"
            >
              <option value="ALL">All Grades</option>
              <option value="Arab Light">Arab Light (32.8° API)</option>
              <option value="Murban Light">Murban Light (39.5° API)</option>
              <option value="Basrah Medium">Basrah Medium (27.9° API)</option>
              <option value="Domestic Reserve">Domestic Reserve (33.0° API)</option>
              <option value="Uncertified">Uncertified Blend</option>
            </select>
          </div>

          {/* Minimum Available Quantity Filter */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Min Available:</span>
            <select
              value={minQuantity}
              onChange={(e) => setMinQuantity(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium focus:outline-hidden focus:border-accent"
            >
              <option value={0}>Any Quantity</option>
              <option value={20000}>≥ 20,000 bbl (Full Cargo)</option>
              <option value={50000}>≥ 50,000 bbl (Large Buffer)</option>
              <option value={100000}>≥ 100,000 bbl (VLCC Lot)</option>
            </select>
          </div>

          {/* Lead time slider */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Max Lead Time:</span>
            <span className="font-mono font-bold text-slate-900">{maxLeadTime}h</span>
            <input
              type="range"
              min="8"
              max="48"
              step="4"
              value={maxLeadTime}
              onChange={(e) => setMaxLeadTime(Number(e.target.value))}
              className="w-24 accent-accent cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Supplier Comparison Table (Exact columns requested in Section 5) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Supplier Name</th>
                <th className="py-3 px-3">Location</th>
                <th className="py-3 px-3">Crude Grade</th>
                <th className="py-3 px-3">Available Quantity</th>
                <th className="py-3 px-3">Lead Time</th>
                <th className="py-3 px-3">Reliability</th>
                <th className="py-3 px-3">Approval Status</th>
                <th className="py-3 px-3">Estimated Cost</th>
                <th className="py-3 px-3">Compatibility</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSuppliers.map((sup) => {
                const isRestricted = sup.approvalStatus === 'RESTRICTED';
                return (
                  <tr
                    key={sup.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isRestricted ? 'bg-red-50/30' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-xs">
                        {sup.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {sup.contractType}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-600">
                      {sup.location}
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-800 block">
                        {sup.crudeGrade}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {sup.apiGravity}° API • {sup.sulfurContentPct}% S
                      </span>
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {sup.availableQuantityBarrels.toLocaleString()} bbl
                    </td>

                    <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                      {sup.leadTimeHours} hrs
                    </td>

                    <td className="py-3 px-3 font-mono">
                      <span
                        className={`font-bold ${
                          sup.reliabilityScorePct >= 95
                            ? 'text-success'
                            : sup.reliabilityScorePct >= 80
                            ? 'text-amber-600'
                            : 'text-red-600'
                        }`}
                      >
                        {sup.reliabilityScorePct}%
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <StatusBadge status={sup.approvalStatus} size="sm" />
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      ${sup.estimatedCostPerBbl.toFixed(2)}/bbl
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-slate-800">
                          {sup.compatibilityPct}%
                        </span>
                        <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              sup.compatibilityPct >= 90
                                ? 'bg-success'
                                : sup.compatibilityPct >= 70
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${sup.compatibilityPct}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {isRestricted ? (
                        <span className="text-[11px] text-red-600 font-semibold">
                          Blocked by GRC
                        </span>
                      ) : (
                        <button
                          onClick={() => setSelectedSupplier(sup)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-primary-soft text-slate-700 hover:text-accent rounded-lg text-xs font-semibold transition-colors"
                        >
                          View Details
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supplier Detail Drawer/Modal */}
      {selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-pop border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                  SUPPLIER PROFILE
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedSupplier.name}
                </h3>
              </div>
              <StatusBadge status={selectedSupplier.approvalStatus} size="md" />
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-500 block">Crude Assay:</span>
                  <span className="font-bold text-slate-900">{selectedSupplier.crudeGrade}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Available Spot/Contract Volume:</span>
                  <span className="font-bold text-slate-900">{selectedSupplier.availableQuantityBarrels.toLocaleString()} bbl</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Lead Time:</span>
                  <span className="font-bold text-slate-900">{selectedSupplier.leadTimeHours} hours</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Benchmark Price:</span>
                  <span className="font-bold text-slate-900">${selectedSupplier.estimatedCostPerBbl.toFixed(2)}/bbl</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700">Compliance & SAP GRC Findings:</span>
                <p className="mt-1 p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-600 leading-relaxed">
                  {selectedSupplier.complianceNotes}
                </p>
              </div>

              <div className="p-3 bg-primary-soft/60 text-accent-strong rounded-xl border border-primary-border/80 text-[11px]">
                <strong>Agent 2 Sourcing Protocol:</strong> Suppliers are evaluated and ranked based on assay compatibility and lead times. Human authorization is mandatory prior to purchase contract emission.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedSupplier(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedSupplier(null);
                  setCurrentView('scenarios');
                }}
                className="px-4 py-2 bg-primary hover:bg-primary-strong text-ink rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                View in Recovery Scenarios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {isAddSupplierOpen && (
        <FormModal
          title="Add Supplier"
          subtitle="Onboard a new crude supplier for sourcing evaluation."
          onClose={() => {
            resetAddSupplierForm();
            setIsAddSupplierOpen(false);
          }}
          onSubmit={handleAddSupplierSubmit}
          submitLabel="Add Supplier"
        >
          <FieldRow>
            <Field label="Name" required>
              <TextInput value={supName} onChange={(e) => setSupName(e.target.value)} required />
            </Field>
            <Field label="Location" required>
              <TextInput value={supLocation} onChange={(e) => setSupLocation(e.target.value)} required />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Country" required>
              <TextInput value={supCountry} onChange={(e) => setSupCountry(e.target.value)} required />
            </Field>
            <Field label="Crude Grade" required>
              <TextInput value={supCrudeGrade} onChange={(e) => setSupCrudeGrade(e.target.value)} placeholder="Arab Light" required />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="API Gravity" required>
              <TextInput
                type="number"
                value={supApiGravity}
                onChange={(e) => setSupApiGravity(Number(e.target.value))}
                required
              />
            </Field>
            <Field label="Sulfur Content (%)" required>
              <TextInput
                type="number"
                value={supSulfurContentPct}
                onChange={(e) => setSupSulfurContentPct(Number(e.target.value))}
                required
              />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Available Quantity (Barrels)" required>
              <TextInput
                type="number"
                value={supAvailableQuantityBarrels}
                onChange={(e) => setSupAvailableQuantityBarrels(Number(e.target.value))}
                required
              />
            </Field>
            <Field label="Lead Time (Hours)" required>
              <TextInput
                type="number"
                value={supLeadTimeHours}
                onChange={(e) => setSupLeadTimeHours(Number(e.target.value))}
                required
              />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Reliability Score (%)" required>
              <TextInput
                type="number"
                min={0}
                max={100}
                value={supReliabilityScorePct}
                onChange={(e) => setSupReliabilityScorePct(Number(e.target.value))}
                required
              />
            </Field>
            <Field label="Estimated Cost ($/bbl)" required>
              <TextInput
                type="number"
                value={supEstimatedCostPerBbl}
                onChange={(e) => setSupEstimatedCostPerBbl(Number(e.target.value))}
                required
              />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Compatibility (%)" required>
              <TextInput
                type="number"
                min={0}
                max={100}
                value={supCompatibilityPct}
                onChange={(e) => setSupCompatibilityPct(Number(e.target.value))}
                required
              />
            </Field>
            <Field label="Port Access" required>
              <TextInput value={supPortAccess} onChange={(e) => setSupPortAccess(e.target.value)} required />
            </Field>
          </FieldRow>
          <Field label="Contract Type" required>
            <Select
              value={supContractType}
              onChange={(e) => setSupContractType(e.target.value as CrudeSupplier['contractType'])}
            >
              <option value="Framework Agreement">Framework Agreement</option>
              <option value="Spot Tender">Spot Tender</option>
              <option value="Internal Transfer">Internal Transfer</option>
              <option value="Restricted Intermediary">Restricted Intermediary</option>
            </Select>
          </Field>
          <Field label="Compliance Notes" required>
            <TextArea
              value={supComplianceNotes}
              onChange={(e) => setSupComplianceNotes(e.target.value)}
              rows={3}
              required
            />
          </Field>
        </FormModal>
      )}
    </div>
  );
};
