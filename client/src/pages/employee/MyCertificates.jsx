import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { getMyCertificates } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useNotification } from '../../context/NotificationContext';
import { CertificateCanvas, exportCertificatePNG, exportCertificatePDF } from '../../components/common/CertificateCanvas';
import { formatDate } from '../../utils/formatters';
import {
  Award,
  Search,
  Download,
  Eye,
  X,
  Calendar,
  Building2,
  CheckCircle2,
  FileText
} from 'lucide-react';

export const MyCertificates = () => {
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCert, setSelectedCert] = useState(null);
  const [downloadingFormat, setDownloadingFormat] = useState(null); // 'PNG' | 'PDF' | null
  const { addToast } = useNotification();

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const res = await getMyCertificates();
      setCertificates(res.data.data.certificates || []);
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const handleDownload = async (cert, format) => {
    setSelectedCert(cert);
    setDownloadingFormat(format);
    const elementId = `cert_view_${cert.id}`;

    setTimeout(async () => {
      try {
        if (format === 'PNG') {
          await exportCertificatePNG(elementId, `Certificate_${cert.certificateId}.png`);
          addToast('success', 'PNG Certificate downloaded successfully!');
        } else if (format === 'PDF') {
          await exportCertificatePDF(elementId, `Certificate_${cert.certificateId}.pdf`);
          addToast('success', 'PDF Certificate downloaded successfully!');
        }
      } catch (err) {
        console.error('Download error:', err);
        addToast('error', `Failed to export ${format} certificate`);
      } finally {
        setDownloadingFormat(null);
      }
    }, 150);
  };

  const filteredCertificates = certificates.filter((cert) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const certId = (cert.certificateId || '').toLowerCase();
    const title = (cert.training?.title || '').toLowerCase();
    const org = (cert.organization?.name || '').toLowerCase();
    return certId.includes(q) || title.includes(q) || org.includes(q);
  });

  if (loading) return <LoadingSpinner text="Loading earned certificates..." />;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="p-4 xs:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Professional Certifications</span>
          <h1 className="text-xl xs:text-2xl font-extrabold text-slate-900 tracking-tight font-heading mt-1">My Training Certificates</h1>
          <p className="text-xs text-slate-500 mt-1">
            View and download official PNG/PDF certificates earned upon completing assigned trainings.
          </p>
        </div>
        <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold self-start sm:self-auto">
          <Award className="w-4 h-4 shrink-0" />
          <span>{certificates.length} Certificate{certificates.length === 1 ? '' : 's'} Earned</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search certificates by training title, certificate ID, or organization..."
          className="w-full bg-transparent text-xs text-slate-900 outline-none"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer">
            Clear
          </button>
        )}
      </div>

      {/* Certificates Grid / Empty State */}
      {filteredCertificates.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-xs text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Award className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Certificates Earned Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {search
              ? 'No certificates match your search query.'
              : 'Complete your assigned training courses 100% to automatically earn official completion certificates.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCertificates.map((cert) => (
            <div
              key={cert.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all space-y-4 flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold font-mono">
                    {cert.certificateId}
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatDate(cert.completionDate)}
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-slate-900 text-base line-clamp-2 group-hover:text-emerald-700 transition-colors">
                    {cert.training?.title || 'Training Program'}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center mt-1">
                    <Building2 className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    {cert.organization?.name || 'Enterprise LMS'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                <div className="flex items-center justify-center space-x-1.5 text-xs text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verified Completion Certificate</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 xs:gap-2 pt-2">
                  <button
                    onClick={() => setSelectedCert(cert)}
                    className="w-full py-2 px-1 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center truncate"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1 shrink-0" /> <span className="truncate">View</span>
                  </button>

                  <button
                    onClick={() => handleDownload(cert, 'PNG')}
                    className="w-full py-2 px-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center justify-center truncate"
                  >
                    <Download className="w-3.5 h-3.5 mr-1 shrink-0" /> <span className="truncate">PNG</span>
                  </button>

                  <button
                    onClick={() => handleDownload(cert, 'PDF')}
                    className="w-full py-2 px-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center justify-center truncate"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1 shrink-0" /> <span className="truncate">PDF</span>
                  </button>
                </div>
              </div>

              {/* Offscreen SVG render canvas element for export */}
              <div className="absolute -left-[9999px] -top-[9999px] opacity-0 pointer-events-none">
                <CertificateCanvas certificate={cert} elementId={`cert_view_${cert.id}`} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FULL CERTIFICATE VIEW MODAL */}
      {selectedCert && ReactDOM.createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in overflow-y-auto"
          onClick={() => setSelectedCert(null)}
        >
          <div
            className="relative w-full max-w-6xl h-[84vh] sm:h-[88vh] max-h-[820px] bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col shadow-2xl overflow-hidden my-auto shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 sm:pb-4 gap-3 shrink-0">
              <div className="min-w-0 pr-2">
                <span className="text-[11px] font-bold text-emerald-700 font-mono tracking-wider">{selectedCert.certificateId}</span>
                <h2
                  className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5 truncate"
                  title={`${selectedCert.employee?.name ? `${selectedCert.employee.name} • ` : ''}${selectedCert.training?.title || ''}`}
                >
                  {selectedCert.employee?.name ? `${selectedCert.employee.name} • ` : ''}
                  {selectedCert.training?.title}
                </h2>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => setSelectedCert(null)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                  aria-label="Close Certificate View"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* FULL RESOLUTION AUTO-ZOOM CANVAS CONTAINER */}
            <div className="flex-1 min-h-0 min-w-0 p-2 sm:p-4 flex items-center justify-center bg-slate-900/5 border border-slate-200/80 rounded-xl overflow-hidden mt-3 sm:mt-4">
              <CertificateCanvas
                certificate={selectedCert}
                elementId={`cert_view_${selectedCert.id}`}
                className="w-full h-full"
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

