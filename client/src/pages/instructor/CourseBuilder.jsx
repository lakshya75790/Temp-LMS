import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getTrainingById,
  saveFullCourse,
  getCategories,
  uploadImage,
  uploadVideo,
  uploadPdf,
  deleteMedia
} from '../../services/api';
import { validateImageFile, validateVideoFile, validateDocumentFile } from '../../utils/fileValidation';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';
import { useNotification } from '../../context/NotificationContext';
import {
  ArrowLeft,
  BookOpen,
  Layers,
  HelpCircle,
  FileCheck2,
  CheckCircle2,
  Plus,
  Trash2,
  Edit3,
  Upload,
  Video,
  FileText,
  Save,
  Send,
  Sparkles,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

export const CourseBuilder = () => {
  const { id: routeTrainingId } = useParams();
  const isEditMode = routeTrainingId && routeTrainingId !== 'new';
  const navigate = useNavigate();
  const { addToast } = useNotification();

  const [loading, setLoading] = useState(isEditMode);
  const [categories, setCategories] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // STEP 1 — BASIC INFORMATION
  const [trainingId, setTrainingId] = useState(isEditMode ? routeTrainingId : null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailPublicId, setThumbnailPublicId] = useState('');
  const [benefits, setBenefits] = useState([]);
  const [benefitInput, setBenefitInput] = useState('');
  const [uploadingThumb, setUploadingThumb] = useState(false);

  // STEP 2 — COURSE BUILDER (SECTIONS & LECTURES)
  const [sections, setSections] = useState([]);
  // Section Modal state
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSectionIdx, setEditingSectionIdx] = useState(null);
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionDesc, setSectionDesc] = useState('');

  // Lecture Modal state
  const [showLectureModal, setShowLectureModal] = useState(false);
  const [targetSectionIdx, setTargetSectionIdx] = useState(null);
  const [editingLectureIdx, setEditingLectureIdx] = useState(null);
  const [lectureTitle, setLectureTitle] = useState('');
  const [lectureDesc, setLectureDesc] = useState('');
  const [lectureVideoUrl, setLectureVideoUrl] = useState('');
  const [lectureVideoPublicId, setLectureVideoPublicId] = useState('');
  const [lectureVideoDuration, setLectureVideoDuration] = useState(0);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // Section Quiz Modal state
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDurationMinutes, setQuizDurationMinutes] = useState(15);
  const [quizPassingScorePercent, setQuizPassingScorePercent] = useState(70);
  const [quizQuestions, setQuizQuestions] = useState([
    {
      questionText: '',
      questionType: 'MCQ',
      options: ['', '', '', ''],
      correctAnswerIndex: 0,
      correctAnswerText: ''
    }
  ]);

  // STEP 3 — ASSIGNMENT & RESOURCES (OPTIONAL)
  const [addAssignmentEnabled, setAddAssignmentEnabled] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentInstructions, setAssignmentInstructions] = useState('');

  const [addResourcesEnabled, setAddResourcesEnabled] = useState(false);
  const [resources, setResources] = useState([]); // [{ title, fileUrl, filePublicId }]
  const [uploadingPdf, setUploadingPdf] = useState(false);

  // Load Categories & Existing Training (if edit)
  useEffect(() => {
    const init = async () => {
      try {
        const catRes = await getCategories();
        setCategories(catRes.data.data.categories || []);

        if (isEditMode) {
          const tRes = await getTrainingById(routeTrainingId);
          const t = tRes.data.data.training;
          if (t) {
            setTrainingId(t._id);
            setTitle(t.title || '');
            setDescription(t.description || '');
            setCategoryId(t.categoryId?._id || t.categoryId || '');
            setThumbnailUrl(t.thumbnailUrl || '');
            setThumbnailPublicId(t.thumbnailPublicId || '');
            setBenefits(t.benefits || []);

            // Populate Sections, Lectures & Section Quizzes
            if (t.sections && t.sections.length > 0) {
              const loadedSections = t.sections.map((sec) => {
                const secQuiz = sec.quiz ||
                  (sec.quizzes && sec.quizzes[0]) ||
                  t.quizzes?.find(q => (q.sectionId && (q.sectionId === sec._id || q.sectionId === sec.id))) ||
                  sec.subSections?.find(sub => sub.quizId)?.quizId || null;

                let mappedQuiz = null;
                if (secQuiz) {
                  mappedQuiz = {
                    id: secQuiz._id || secQuiz.id,
                    title: secQuiz.title || `${sec.title || 'Section'} Quiz`,
                    timeLimitMinutes: secQuiz.timeLimitMinutes || 15,
                    passingScorePercent: secQuiz.passingScorePercent || 70,
                    questions: Array.isArray(secQuiz.questions) && secQuiz.questions.length > 0
                      ? secQuiz.questions.map(q => ({
                          id: q._id || q.id,
                          questionText: q.questionText || '',
                          questionType: q.questionType || (q.options?.length > 0 ? 'MCQ' : 'FILL_IN_BLANK'),
                          options: Array.isArray(q.options) && q.options.length > 0 ? [...q.options] : ['', '', '', ''],
                          correctAnswerIndex: q.correctAnswerIndex !== undefined && q.correctAnswerIndex !== null ? Number(q.correctAnswerIndex) : 0,
                          correctAnswerText: q.correctAnswerText || ''
                        }))
                      : []
                  };
                }

                return {
                  id: sec._id || sec.id,
                  title: sec.title || '',
                  description: sec.description || '',
                  quiz: mappedQuiz,
                  lectures: sec.subSections ? sec.subSections.map(sub => ({
                    id: sub._id || sub.id,
                    title: sub.title || '',
                    description: sub.description || '',
                    videoUrl: sub.videoUrl || '',
                    videoPublicId: sub.videoPublicId || '',
                    videoDuration: sub.videoDuration || 0
                  })) : []
                };
              });

              // Backward compatibility fallback: if course has an unmapped quiz, attach to first section
              if (t.quizzes && t.quizzes.length > 0 && !loadedSections.some(s => s.quiz)) {
                const legacyQuiz = t.quizzes[0];
                loadedSections[0].quiz = {
                  id: legacyQuiz._id || legacyQuiz.id,
                  title: legacyQuiz.title || `${loadedSections[0].title} Quiz`,
                  timeLimitMinutes: legacyQuiz.timeLimitMinutes || 15,
                  passingScorePercent: legacyQuiz.passingScorePercent || 70,
                  questions: Array.isArray(legacyQuiz.questions)
                    ? legacyQuiz.questions.map(q => ({
                        id: q._id || q.id,
                        questionText: q.questionText || '',
                        questionType: q.questionType || (q.options?.length > 0 ? 'MCQ' : 'FILL_IN_BLANK'),
                        options: Array.isArray(q.options) && q.options.length > 0 ? [...q.options] : ['', '', '', ''],
                        correctAnswerIndex: q.correctAnswerIndex !== undefined && q.correctAnswerIndex !== null ? Number(q.correctAnswerIndex) : 0,
                        correctAnswerText: q.correctAnswerText || ''
                      }))
                    : []
                };
              }

              setSections(loadedSections);
            }

            // Populate Assignment
            const firstAss = t.sections?.flatMap(s => s.subSections || []).find(sub => sub.assignmentId)?.assignmentId;
            if (firstAss) {
              setAddAssignmentEnabled(true);
              setAssignmentTitle(firstAss.title || '');
              setAssignmentInstructions(firstAss.instructions || '');
            }

            // Populate Resources
            const pdfs = t.sections?.flatMap(s => s.subSections || []).flatMap(sub => sub.pdfResources || []);
            if (pdfs && pdfs.length > 0) {
              setAddResourcesEnabled(true);
              setResources(pdfs.map(p => ({ title: p.title, fileUrl: p.fileUrl, filePublicId: p.filePublicId })));
            }
          }
        }
      } catch (err) {
        addToast('error', 'Failed to load course details');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [routeTrainingId, isEditMode]);

  // BENEFIT HANDLERS
  const handleAddBenefit = () => {
    if (!benefitInput.trim()) return;
    setBenefits([...benefits, benefitInput.trim()]);
    setBenefitInput('');
  };

  const handleDeleteBenefit = (idx) => {
    setBenefits(benefits.filter((_, i) => i !== idx));
  };

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      addToast('error', validation.error);
      e.target.value = null;
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setUploadingThumb(true);
    try {
      const res = await uploadImage(formData);
      const newPublicId = res.data.data.publicId || res.data.data.public_id || res.data.data.url;
      const oldTarget = thumbnailPublicId || thumbnailUrl;
      if (oldTarget && oldTarget !== newPublicId) {
        deleteMedia(oldTarget, 'image').catch(err => console.warn('Failed to delete old thumbnail from Cloudinary:', err));
      }
      setThumbnailUrl(res.data.data.url);
      setThumbnailPublicId(newPublicId);
      addToast('success', 'Thumbnail uploaded successfully!');
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to upload thumbnail');
    } finally {
      setUploadingThumb(false);
      e.target.value = null;
    }
  };

  const handleDeleteThumbnail = async () => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    const target = thumbnailPublicId || thumbnailUrl;
    try {
      if (target) {
        await deleteMedia(target, 'image');
      }
      setThumbnailUrl('');
      setThumbnailPublicId('');
      addToast('success', 'File deleted successfully.');
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Unable to delete the file. Please try again.');
    }
  };

  // SECTION HANDLERS
  const openAddSectionModal = () => {
    setEditingSectionIdx(null);
    setSectionTitle('');
    setSectionDesc('');
    setShowSectionModal(true);
  };

  const openEditSectionModal = (idx) => {
    setEditingSectionIdx(idx);
    setSectionTitle(sections[idx].title);
    setSectionDesc(sections[idx].description || '');
    setShowSectionModal(true);
  };

  const handleSaveSection = (e) => {
    e.preventDefault();
    if (!sectionTitle.trim()) {
      addToast('error', 'Section title is required');
      return;
    }

    if (editingSectionIdx !== null) {
      const updated = [...sections];
      updated[editingSectionIdx].title = sectionTitle.trim();
      updated[editingSectionIdx].description = sectionDesc.trim();
      setSections(updated);
      addToast('success', 'Section updated');
    } else {
      setSections([...sections, { title: sectionTitle.trim(), description: sectionDesc.trim(), lectures: [] }]);
      addToast('success', 'Section added');
    }
    setShowSectionModal(false);
  };

  const handleDeleteSection = (idx) => {
    if (!window.confirm('Are you sure you want to delete this section and its lectures?')) return;
    setSections(sections.filter((_, i) => i !== idx));
    addToast('success', 'Section deleted');
  };

  // LECTURE HANDLERS
  const openAddLectureModal = (sIdx) => {
    setTargetSectionIdx(sIdx);
    setEditingLectureIdx(null);
    setLectureTitle('');
    setLectureDesc('');
    setLectureVideoUrl('');
    setLectureVideoPublicId('');
    setLectureVideoDuration(0);
    setShowLectureModal(true);
  };

  const openEditLectureModal = (sIdx, lIdx) => {
    setTargetSectionIdx(sIdx);
    setEditingLectureIdx(lIdx);
    const lec = sections[sIdx].lectures[lIdx];
    setLectureTitle(lec.title);
    setLectureDesc(lec.description || '');
    setLectureVideoUrl(lec.videoUrl || '');
    setLectureVideoPublicId(lec.videoPublicId || '');
    setLectureVideoDuration(lec.videoDuration || 0);
    setShowLectureModal(true);
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validation = validateVideoFile(file);
    if (!validation.valid) {
      addToast('error', validation.error);
      e.target.value = null;
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setUploadingVideo(true);
    try {
      const res = await uploadVideo(formData);
      const newPublicId = res.data.data.publicId || res.data.data.public_id || res.data.data.url;
      const oldTarget = lectureVideoPublicId || lectureVideoUrl;
      if (oldTarget && oldTarget !== newPublicId) {
        deleteMedia(oldTarget, 'video').catch(err => console.warn('Failed to delete old video from Cloudinary:', err));
      }
      setLectureVideoUrl(res.data.data.url);
      setLectureVideoPublicId(newPublicId);
      addToast('success', 'Lecture video uploaded to Cloudinary!');
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to upload video');
    } finally {
      setUploadingVideo(false);
      e.target.value = null;
    }
  };

  const handleDeleteLectureVideo = async () => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    const target = lectureVideoPublicId || lectureVideoUrl;
    try {
      if (target) {
        await deleteMedia(target, 'video');
      }
      setLectureVideoUrl('');
      setLectureVideoPublicId('');
      addToast('success', 'File deleted successfully.');
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Unable to delete the file. Please try again.');
    }
  };

  const handleSaveLecture = (e) => {
    e.preventDefault();
    if (!lectureTitle.trim()) {
      addToast('error', 'Lecture title is required');
      return;
    }

    const updated = [...sections];
    const lecObj = {
      title: lectureTitle.trim(),
      description: lectureDesc.trim(),
      videoUrl: lectureVideoUrl,
      videoPublicId: lectureVideoPublicId,
      videoDuration: Number(lectureVideoDuration) || 0
    };

    if (editingLectureIdx !== null) {
      updated[targetSectionIdx].lectures[editingLectureIdx] = lecObj;
      addToast('success', 'Lecture updated');
    } else {
      updated[targetSectionIdx].lectures.push(lecObj);
      addToast('success', 'Lecture added to section');
    }

    setSections(updated);
    setShowLectureModal(false);
  };

  const handleDeleteLecture = async (sIdx, lIdx) => {
    if (!window.confirm('Are you sure you want to delete this lecture?')) return;
    const lec = sections[sIdx].lectures[lIdx];
    if (lec && lec.videoPublicId) {
      try {
        await deleteMedia(lec.videoPublicId, 'video');
      } catch (err) {
        console.warn('Failed to delete lecture video asset from Cloudinary:', err);
      }
    }
    const updated = [...sections];
    updated[sIdx].lectures = updated[sIdx].lectures.filter((_, i) => i !== lIdx);
    setSections(updated);
    addToast('success', 'Lecture deleted');
  };

  // SECTION QUIZ HANDLERS
  const openAddQuizModal = (sIdx) => {
    setTargetSectionIdx(sIdx);
    const sec = sections[sIdx];
    setQuizTitle(sec ? `${sec.title} Quiz` : 'Section Quiz');
    setQuizDurationMinutes(15);
    setQuizPassingScorePercent(70);
    setQuizQuestions([
      {
        questionText: '',
        questionType: 'MCQ',
        options: ['', '', '', ''],
        correctAnswerIndex: 0,
        correctAnswerText: ''
      }
    ]);
    setShowQuizModal(true);
  };

  const openEditQuizModal = (sIdx) => {
    setTargetSectionIdx(sIdx);
    const sec = sections[sIdx];
    const quiz = sec?.quiz;
    if (quiz) {
      setQuizTitle(quiz.title || `${sec.title} Quiz`);
      setQuizDurationMinutes(quiz.timeLimitMinutes || 15);
      setQuizPassingScorePercent(quiz.passingScorePercent || 70);
      if (quiz.questions && quiz.questions.length > 0) {
        setQuizQuestions(quiz.questions.map(q => ({
          id: q.id || q._id,
          questionText: q.questionText || '',
          questionType: q.questionType || (q.options?.length > 0 ? 'MCQ' : 'FILL_IN_BLANK'),
          options: Array.isArray(q.options) && q.options.length > 0 ? [...q.options] : ['', '', '', ''],
          correctAnswerIndex: q.correctAnswerIndex !== undefined && q.correctAnswerIndex !== null ? Number(q.correctAnswerIndex) : 0,
          correctAnswerText: q.correctAnswerText || ''
        })));
      } else {
        setQuizQuestions([
          {
            questionText: '',
            questionType: 'MCQ',
            options: ['', '', '', ''],
            correctAnswerIndex: 0,
            correctAnswerText: ''
          }
        ]);
      }
    } else {
      openAddQuizModal(sIdx);
      return;
    }
    setShowQuizModal(true);
  };

  const handleSaveSectionQuiz = (e) => {
    e.preventDefault();
    if (!quizTitle.trim()) {
      addToast('error', 'Quiz Title is required');
      return;
    }

    const validQuestions = quizQuestions.filter(q => q.questionText && q.questionText.trim());
    if (validQuestions.length === 0) {
      addToast('error', 'Please provide at least one question with question text');
      return;
    }

    for (let i = 0; i < validQuestions.length; i++) {
      const q = validQuestions[i];
      if (q.questionType === 'MCQ') {
        const filledOpts = (q.options || []).filter(o => o && o.trim());
        if (filledOpts.length < 2) {
          addToast('error', `Question #${i + 1}: Multiple choice questions must have at least 2 options`);
          return;
        }
      }
    }

    const updated = [...sections];
    const existingSecQuiz = updated[targetSectionIdx]?.quiz;
    updated[targetSectionIdx].quiz = {
      ...(existingSecQuiz || {}),
      title: quizTitle.trim(),
      timeLimitMinutes: Number(quizDurationMinutes) || 15,
      passingScorePercent: Number(quizPassingScorePercent) || 70,
      questions: validQuestions.map((q, qIdx) => ({
        ...q,
        order: qIdx + 1
      }))
    };

    setSections(updated);
    setShowQuizModal(false);
    addToast('success', `Quiz configured for ${updated[targetSectionIdx].title}`);
  };

  const handleRemoveSectionQuiz = (sIdx) => {
    if (!window.confirm(`Are you sure you want to remove the quiz from ${sections[sIdx].title}?`)) return;
    const updated = [...sections];
    updated[sIdx].quiz = null;
    setSections(updated);
    addToast('success', 'Quiz removed from section');
  };

  // QUIZ QUESTION BUILDER HANDLERS
  const handleAddQuestion = () => {
    setQuizQuestions([
      ...quizQuestions,
      { questionText: '', questionType: 'MCQ', options: ['', '', '', ''], correctAnswerIndex: 0, correctAnswerText: '' }
    ]);
  };

  const handleDeleteQuestion = (idx) => {
    setQuizQuestions(quizQuestions.filter((_, i) => i !== idx));
  };

  // RESOURCE UPLOAD HANDLERS
  const handlePdfUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Filter valid document files
    const validFiles = [];
    for (const file of files) {
      const validation = validateDocumentFile(file);
      if (!validation.valid) {
        addToast('error', `${file.name}: ${validation.error}`);
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      e.target.value = null;
      return;
    }

    setUploadingPdf(true);
    try {
      const uploadedList = [];
      for (const file of validFiles) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await uploadPdf(formData);
        const pId = res.data.data.publicId || res.data.data.public_id || res.data.data.url;
        uploadedList.push({
          title: file.name,
          fileUrl: res.data.data.url,
          filePublicId: pId
        });
      }
      setResources([...resources, ...uploadedList]);
      addToast('success', `${uploadedList.length} PDF resource(s) uploaded successfully!`);
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to upload PDF resources');
    } finally {
      setUploadingPdf(false);
      e.target.value = null;
    }
  };

  const handleDeleteResource = async (idx) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    const targetRes = resources[idx];
    try {
      const target = targetRes?.filePublicId || targetRes?.pdfPublicId || targetRes?.fileUrl || targetRes?.pdfUrl;
      if (target) {
        await deleteMedia(target, 'raw');
      }
      setResources(resources.filter((_, i) => i !== idx));
      addToast('success', 'File deleted successfully.');
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Unable to delete the file. Please try again.');
    }
  };

  // STEP NAVIGATION VALIDATION
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!title.trim()) {
        addToast('error', 'Training Title is required');
        return;
      }
      if (!categoryId) {
        addToast('error', 'Please select a Category');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (sections.length === 0) {
        addToast('error', 'Please add at least one Section to your course structure');
        return;
      }
      const hasAnyLectures = sections.some(s => s.lectures && s.lectures.length > 0);
      if (!hasAnyLectures) {
        addToast('error', 'Please add at least one Lecture inside your section');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // SUBMIT COURSE (SAVE AS DRAFT / PUBLISH)
  const handleFinalSubmit = async (targetStatus) => {
    if (submitting) return;

    if (!title.trim() || !categoryId) {
      addToast('error', 'Basic details missing. Please complete Step 1.');
      setCurrentStep(1);
      return;
    }

    if (sections.length === 0) {
      addToast('error', 'Please add at least one Section in Step 2.');
      setCurrentStep(2);
      return;
    }

    setSubmitting(true);

    try {
      // Prepare sections with section-wise quizzes
      let preparedSections = sections.map((sec) => {
        let secQuiz = null;
        if (sec.quiz && sec.quiz.questions && sec.quiz.questions.length > 0) {
          secQuiz = {
            id: sec.quiz.id || sec.quiz._id,
            title: sec.quiz.title || `${sec.title} Quiz`,
            timeLimitMinutes: Number(sec.quiz.timeLimitMinutes) || 15,
            passingScorePercent: Number(sec.quiz.passingScorePercent) || 70,
            questions: sec.quiz.questions.filter(q => q.questionText && q.questionText.trim()).map((q, qIdx) => {
              const qType = q.questionType || (q.options?.length > 0 ? 'MCQ' : 'FILL_IN_BLANK');
              if (qType === 'TRUE_FALSE') {
                const idx = Number(q.correctAnswerIndex) === 1 ? 1 : 0;
                return {
                  id: q.id || q._id,
                  questionText: q.questionText,
                  questionType: 'TRUE_FALSE',
                  options: ['True', 'False'],
                  correctAnswerIndex: idx,
                  correctAnswerText: idx === 0 ? 'True' : 'False',
                  order: q.order !== undefined ? Number(q.order) : qIdx + 1
                };
              } else if (qType === 'FILL_IN_BLANK') {
                return {
                  id: q.id || q._id,
                  questionText: q.questionText,
                  questionType: 'FILL_IN_BLANK',
                  options: [],
                  correctAnswerIndex: null,
                  correctAnswerText: (q.correctAnswerText || '').trim(),
                  order: q.order !== undefined ? Number(q.order) : qIdx + 1
                };
              } else {
                const idx = Number(q.correctAnswerIndex) || 0;
                const opts = Array.isArray(q.options) ? q.options : [];
                return {
                  id: q.id || q._id,
                  questionText: q.questionText,
                  questionType: 'MCQ',
                  options: opts,
                  correctAnswerIndex: idx,
                  correctAnswerText: opts[idx] || '',
                  order: q.order !== undefined ? Number(q.order) : qIdx + 1
                };
              }
            })
          };
        }
        return {
          id: sec.id || sec._id,
          title: sec.title,
          description: sec.description,
          lectures: sec.lectures ? sec.lectures.map(lec => ({
            id: lec.id || lec._id,
            title: lec.title,
            description: lec.description,
            videoUrl: lec.videoUrl,
            videoPublicId: lec.videoPublicId,
            videoDuration: lec.videoDuration
          })) : [],
          quiz: secQuiz
        };
      });

      const payload = {
        trainingId,
        title: title.trim(),
        description: description.trim() || title.trim(),
        categoryId,
        thumbnailUrl,
        thumbnailPublicId,
        benefits,
        durationDays: 30,
        status: targetStatus, // 'draft' | 'published'
        sections: preparedSections,
        assignment: addAssignmentEnabled && assignmentInstructions.trim() ? {
          title: assignmentTitle.trim() || `${title} Project Assignment`,
          instructions: assignmentInstructions.trim()
        } : null,
        resources: addResourcesEnabled ? resources : []
      };

      await saveFullCourse(payload);
      addToast('success', `Training successfully ${targetStatus === 'published' ? 'published' : 'saved as draft'}!`);
      navigate('/instructor/trainings');
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to save training course');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading course builder details..." />;

  const stepsList = [
    { step: 1, label: 'Basic Info' },
    { step: 2, label: 'Course Builder' },
    { step: 3, label: 'Assignment & Resources' },
    { step: 4, label: 'Review & Publish' }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Header Bar */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/instructor/trainings')}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="inline-flex items-center text-[11px] font-bold text-emerald-700">
              <Sparkles className="w-3 h-3 mr-1" /> {isEditMode ? 'Edit Course' : 'Create New Course'}
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-heading">
              {title || 'Untitled Course'}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleFinalSubmit('draft')}
            disabled={submitting}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Draft'}
          </button>
        </div>
      </div>

      {/* Stepper Navigation */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between relative overflow-x-auto">
          {stepsList.map((st, idx) => {
            const isActive = currentStep === st.step;
            const isDone = currentStep > st.step;
            return (
              <div key={st.step} className="flex items-center space-x-2 flex-shrink-0 px-2">
                <button
                  onClick={() => {
                    if (st.step < currentStep || isDone) setCurrentStep(st.step);
                  }}
                  disabled={st.step > currentStep}
                  className={`flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isDone
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-400 opacity-60'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                    isActive ? 'bg-white text-emerald-700' : isDone ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-600'
                  }`}>
                    {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : st.step}
                  </span>
                  <span className="whitespace-nowrap">{st.label}</span>
                </button>
                {idx < stepsList.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1 — BASIC INFORMATION */}
      {currentStep === 1 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-emerald-600" />
              Step 1: Basic Information
            </h2>
            <p className="text-xs text-slate-500">Provide the title, category, description, and thumbnail for this course.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Course Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Master React 19 & Next.js Architecture"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:border-emerald-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Short Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="A concise overview of what learners will gain from this course..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:border-emerald-600 outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:border-emerald-600 outline-none cursor-pointer"
              >
                <option value="">-- Choose Category --</option>
                {categories.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Thumbnail Upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Course Thumbnail Image
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                {thumbnailUrl ? (
                  <img src={thumbnailUrl} alt="Thumbnail preview" className="w-28 h-20 rounded-xl object-cover border border-slate-200" />
                ) : (
                  <div className="w-28 h-20 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold">
                    No Preview
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">
                      <Upload className="w-4 h-4 mr-1.5" />
                      {uploadingThumb ? 'Uploading...' : 'Upload Thumbnail Image'}
                      <input type="file" accept="image/*" onChange={handleThumbnailUpload} className="hidden" disabled={uploadingThumb} />
                    </label>

                    {thumbnailUrl && (
                      <button
                        type="button"
                        onClick={handleDeleteThumbnail}
                        disabled={uploadingThumb}
                        className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Delete Image
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">Supports PNG, JPG, WEBP. Max file size 5MB.</p>
                </div>
              </div>
            </div>

            {/* Benefits Multi-Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Benefits of the Course
              </label>
              <div className="flex items-center space-x-2 mb-3">
                <input
                  type="text"
                  value={benefitInput}
                  onChange={(e) => setBenefitInput(e.target.value)}
                  placeholder="e.g. Learn modern React state management"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddBenefit(); } }}
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-emerald-600 outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddBenefit}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 cursor-pointer"
                >
                  + Add Benefit
                </button>
              </div>

              {benefits.length > 0 && (
                <div className="space-y-1.5">
                  {benefits.map((b, bIdx) => (
                    <div key={bIdx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <span className="font-semibold text-slate-800">• {b}</span>
                      <button
                        onClick={() => handleDeleteBenefit(bIdx)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2 — COURSE BUILDER */}
      {currentStep === 2 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center">
                <Layers className="w-5 h-5 mr-2 text-emerald-600" />
                Step 2: Course Builder
              </h2>
              <p className="text-xs text-slate-500">Structure your course into Sections and Add Video Lectures inside each section.</p>
            </div>
            <button
              onClick={openAddSectionModal}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Section
            </button>
          </div>

          {sections.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <Layers className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="font-bold text-slate-900 text-sm">No Sections Added Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click "+ Add Section" above to create module sections for your course.
              </p>
              <button
                onClick={openAddSectionModal}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
              >
                Add Section
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {sections.map((sec, sIdx) => (
                <div key={sIdx} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base flex items-center">
                        <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 font-extrabold text-xs flex items-center justify-center mr-2">
                          {sIdx + 1}
                        </span>
                        {sec.title}
                      </h3>
                      {sec.description && <p className="text-xs text-slate-500 mt-0.5 ml-8">{sec.description}</p>}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openAddLectureModal(sIdx)}
                        className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 text-xs font-semibold hover:bg-teal-100 transition-colors cursor-pointer inline-flex items-center"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Lecture
                      </button>
                      {!sec.quiz && (
                        <button
                          type="button"
                          onClick={() => openAddQuizModal(sIdx)}
                          className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer inline-flex items-center"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Add Quiz
                        </button>
                      )}
                      <button onClick={() => openEditSectionModal(sIdx)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 cursor-pointer">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteSection(sIdx)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Lectures List */}
                  <div className="space-y-2 pl-4 border-l-2 border-slate-200">
                    {(!sec.lectures || sec.lectures.length === 0) ? (
                      <p className="text-xs text-slate-400 italic py-1">No lectures added to this section yet.</p>
                    ) : (
                      sec.lectures.map((lec, lIdx) => (
                        <div key={lIdx} className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-3">
                            <Video className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <div>
                              <p className="font-bold text-slate-900">{lec.title}</p>
                              {lec.description && <p className="text-[11px] text-slate-500 line-clamp-1">{lec.description}</p>}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {lec.videoUrl && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                                Video Attached
                              </span>
                            )}
                            <button onClick={() => openEditLectureModal(sIdx, lIdx)} className="p-1 text-slate-400 hover:text-emerald-600 cursor-pointer">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteLecture(sIdx, lIdx)} className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Section Quiz (Configured independently per section) */}
                  <div className="pt-2 pl-4 border-l-2 border-slate-200">
                    {sec.quiz ? (
                      <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-start sm:items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 font-bold">
                            <HelpCircle className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-200 text-amber-800">
                                Section Quiz
                              </span>
                              <p className="font-bold text-slate-900 text-sm">{sec.quiz.title || `${sec.title} Quiz`}</p>
                            </div>
                            <div className="flex items-center space-x-3 text-[11px] text-slate-600 mt-1">
                              <span>{sec.quiz.questions?.length || 0} Questions</span>
                              <span>•</span>
                              <span>{sec.quiz.timeLimitMinutes || 15} Mins</span>
                              <span>•</span>
                              <span>Pass: {sec.quiz.passingScorePercent || 70}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => openEditQuizModal(sIdx)}
                            className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-800 font-semibold text-xs hover:bg-amber-50 cursor-pointer inline-flex items-center shadow-xs"
                          >
                            <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit Quiz
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSectionQuiz(sIdx)}
                            className="px-2.5 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-600 font-semibold text-xs hover:bg-rose-50 cursor-pointer inline-flex items-center shadow-xs"
                            title="Remove Quiz"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-start">
                        <button
                          type="button"
                          onClick={() => openAddQuizModal(sIdx)}
                          className="text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100/80 border border-dashed border-amber-300 rounded-xl px-3 py-2 inline-flex items-center transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1.5" />
                          Add Quiz for {sec.title}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 3 — ASSIGNMENT & RESOURCES (OPTIONAL) */}
      {currentStep === 3 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center">
                <FileCheck2 className="w-5 h-5 mr-2 text-emerald-600" />
                Step 3: Assignment & Resources (Optional)
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Optional Step
              </span>
            </div>
          </div>

          <div className="space-y-6">
            {/* Section A: Assignment */}
            <div className="space-y-4">
              <label className="flex items-center space-x-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addAssignmentEnabled}
                  onChange={(e) => setAddAssignmentEnabled(e.target.checked)}
                  className="w-5 h-5 text-emerald-600 rounded cursor-pointer"
                />
                <div>
                  <span className="font-bold text-slate-900 text-sm">Add Project Assignment</span>
                  <p className="text-xs text-slate-500">Require students to submit practical project work for review.</p>
                </div>
              </label>

              {addAssignmentEnabled && (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Assignment Title</label>
                    <input
                      type="text"
                      value={assignmentTitle}
                      onChange={(e) => setAssignmentTitle(e.target.value)}
                      placeholder="e.g. Build a Full Stack React & Node Application"
                      className="w-full px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Assignment Question / Instructions</label>
                    <textarea
                      value={assignmentInstructions}
                      onChange={(e) => setAssignmentInstructions(e.target.value)}
                      rows={4}
                      placeholder="Detailed project guidelines and requirements..."
                      className="w-full px-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Section B: Resources */}
            <div className="space-y-4">
              <label className="flex items-center space-x-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addResourcesEnabled}
                  onChange={(e) => setAddResourcesEnabled(e.target.checked)}
                  className="w-5 h-5 text-teal-600 rounded cursor-pointer"
                />
                <div>
                  <span className="font-bold text-slate-900 text-sm">Add Downloadable PDF Resources</span>
                  <p className="text-xs text-slate-500">Attach course guides, cheat sheets, or reference documentation.</p>
                </div>
              </label>

              {addResourcesEnabled && (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div>
                    <label className="cursor-pointer inline-flex items-center px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors shadow-xs">
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingPdf ? 'Uploading PDFs...' : 'Upload PDF Files'}
                      <input
                        type="file"
                        accept="application/pdf"
                        multiple
                        onChange={handlePdfUpload}
                        className="hidden"
                        disabled={uploadingPdf}
                      />
                    </label>
                  </div>

                  {resources.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-xs text-slate-700">Selected PDF Resources:</h4>
                      {resources.map((res, rIdx) => (
                        <div key={rIdx} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 text-xs">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <span className="font-bold text-slate-900">{res.title}</span>
                          </div>
                          <button onClick={() => handleDeleteResource(rIdx)} className="text-slate-400 hover:text-rose-600 cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 4 — FINAL REVIEW & PUBLISH */}
      {currentStep === 4 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-600" />
              Step 4: Final Review & Publish
            </h2>
            <p className="text-xs text-slate-500">Review your course summary before saving as draft or publishing.</p>
          </div>

          <div className="space-y-6 text-xs">
            {/* Overview Summary */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-700">
                  {categories.find(c => String(c._id) === String(categoryId))?.name || 'Category'}
                </span>
                <span className="font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Step 1 Verified
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
              <p className="text-slate-600">{description || 'No description provided.'}</p>
              {benefits.length > 0 && (
                <div className="pt-2">
                  <span className="font-bold text-slate-700">Course Benefits:</span>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-500">
                    {benefits.map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {/* Sections, Lectures & Quizzes Summary */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center">
                <Layers className="w-4 h-4 mr-1.5 text-emerald-600" /> Course Structure ({sections.length} Sections)
              </h4>
              <div className="space-y-2">
                {sections.map((sec, sIdx) => (
                  <div key={sIdx} className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-900">Section {sIdx + 1}: {sec.title}</p>
                      {sec.quiz ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                          Quiz: {sec.quiz.questions?.length || 0} Questions
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-semibold">No Quiz</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">{sec.lectures?.length || 0} Lectures attached</p>
                    {sec.quiz && (
                      <p className="text-[11px] text-amber-700 font-medium">
                        ✦ Quiz: {sec.quiz.title} ({sec.quiz.timeLimitMinutes || 15}m • Pass: {sec.quiz.passingScorePercent || 70}%)
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Assignment Summary */}
            {addAssignmentEnabled && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-1">
                <h4 className="font-bold text-xs flex items-center">
                  <FileCheck2 className="w-4 h-4 mr-1.5" /> Project Assignment Included
                </h4>
                <p className="text-[11px]">{assignmentInstructions}</p>
              </div>
            )}

            {/* Resources Summary */}
            {addResourcesEnabled && resources.length > 0 && (
              <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 space-y-1">
                <h4 className="font-bold text-xs flex items-center">
                  <FileText className="w-4 h-4 mr-1.5" /> {resources.length} Downloadable PDF Resources Attached
                </h4>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer Controls (Prev, Next, Save Draft, Publish) */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          onClick={handlePrevStep}
          disabled={currentStep === 1 || submitting}
          className="inline-flex items-center px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold disabled:opacity-40 cursor-pointer hover:bg-slate-50 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous Step
        </button>

        <div className="flex items-center space-x-3">
          {currentStep < 4 ? (
            <button
              onClick={handleNextStep}
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            >
              Next Step <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          ) : (
            <button
              onClick={() => handleFinalSubmit('published')}
              disabled={submitting}
              className="inline-flex items-center px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4 mr-1.5" />
              {submitting ? 'Saving Changes...' : (isEditMode ? 'Save Changes' : 'Publish Course')}
            </button>
          )}
        </div>
      </div>

      {/* SECTION MODAL */}
      <Modal isOpen={showSectionModal} onClose={() => setShowSectionModal(false)} title={editingSectionIdx !== null ? 'Edit Section' : 'Add Section Module'}>
        <form onSubmit={handleSaveSection} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Section Title *</label>
            <input
              type="text"
              value={sectionTitle}
              onChange={(e) => setSectionTitle(e.target.value)}
              required
              placeholder="e.g. Module 1: Introduction & Environment Setup"
              className="w-full px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Optional Section Description</label>
            <textarea
              value={sectionDesc}
              onChange={(e) => setSectionDesc(e.target.value)}
              rows={2}
              placeholder="Section goals and objectives..."
              className="w-full px-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none resize-none focus:border-emerald-600"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
            <button type="button" onClick={() => setShowSectionModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700">
              Save Section
            </button>
          </div>
        </form>
      </Modal>

      {/* LECTURE MODAL */}
      <Modal isOpen={showLectureModal} onClose={() => setShowLectureModal(false)} title={editingLectureIdx !== null ? 'Edit Lecture' : 'Add Lecture Video'}>
        <form onSubmit={handleSaveLecture} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Lecture Title *</label>
            <input
              type="text"
              value={lectureTitle}
              onChange={(e) => setLectureTitle(e.target.value)}
              required
              placeholder="e.g. Lecture 1.1: What is React?"
              className="w-full px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Lecture Description</label>
            <textarea
              value={lectureDesc}
              onChange={(e) => setLectureDesc(e.target.value)}
              rows={2}
              placeholder="Lecture notes and summary..."
              className="w-full px-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none resize-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Lecture Video *</label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="cursor-pointer inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800">
                <Upload className="w-4 h-4 mr-1.5 text-emerald-400" />
                {uploadingVideo ? 'Uploading Video...' : 'Upload Video File'}
                <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" disabled={uploadingVideo} />
              </label>
              {lectureVideoUrl && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-emerald-600 font-mono font-bold truncate max-w-xs">Video Attached</span>
                  <button
                    type="button"
                    onClick={handleDeleteLectureVideo}
                    disabled={uploadingVideo}
                    className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Delete Video
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
            <button type="button" onClick={() => setShowLectureModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700">
              Save Lecture
            </button>
          </div>
        </form>
      </Modal>

      {/* SECTION QUIZ MODAL */}
      <Modal
        isOpen={showQuizModal}
        onClose={() => setShowQuizModal(false)}
        title={targetSectionIdx !== null && sections[targetSectionIdx]?.quiz ? `Edit Quiz — ${sections[targetSectionIdx]?.title}` : `Add Quiz — ${sections[targetSectionIdx]?.title || 'Section'}`}
      >
        <form onSubmit={handleSaveSectionQuiz} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quiz Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                required
                placeholder="e.g. Section Assessment Quiz"
                className="w-full px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (Minutes)</label>
              <input
                type="number"
                value={quizDurationMinutes}
                onChange={(e) => setQuizDurationMinutes(Math.max(1, Number(e.target.value) || 1))}
                min={1}
                className="w-full px-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Passing Score (%)</label>
              <input
                type="number"
                value={quizPassingScorePercent}
                onChange={(e) => setQuizPassingScorePercent(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
                min={1}
                max={100}
                className="w-full px-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Question Builder */}
          <div className="space-y-4 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Questions ({quizQuestions.length})
              </h4>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-3 py-1 rounded-xl bg-amber-50 text-amber-700 font-semibold text-xs hover:bg-amber-100 border border-amber-200 cursor-pointer inline-flex items-center"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Question
              </button>
            </div>

            {quizQuestions.map((q, qIdx) => {
              const currentType = q.questionType || (q.options?.length > 0 ? 'MCQ' : 'FILL_IN_BLANK');

              return (
                <div key={qIdx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-amber-700">Question #{qIdx + 1}</span>
                    <div className="flex items-center space-x-2">
                      <select
                        value={currentType}
                        onChange={(e) => {
                          const newType = e.target.value;
                          const updated = [...quizQuestions];
                          updated[qIdx].questionType = newType;
                          if (newType === 'TRUE_FALSE') {
                            updated[qIdx].options = ['True', 'False'];
                            updated[qIdx].correctAnswerIndex = 0;
                            updated[qIdx].correctAnswerText = 'True';
                          } else if (newType === 'FILL_IN_BLANK') {
                            updated[qIdx].options = [];
                            updated[qIdx].correctAnswerIndex = null;
                            updated[qIdx].correctAnswerText = '';
                          } else {
                            if (!updated[qIdx].options || updated[qIdx].options.length < 2) {
                              updated[qIdx].options = ['', '', '', ''];
                            }
                            updated[qIdx].correctAnswerIndex = 0;
                            updated[qIdx].correctAnswerText = updated[qIdx].options[0] || '';
                          }
                          setQuizQuestions(updated);
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 outline-none cursor-pointer"
                      >
                        <option value="MCQ">Multiple Choice (MCQ)</option>
                        <option value="TRUE_FALSE">True / False</option>
                        <option value="FILL_IN_BLANK">Fill in the Blank</option>
                      </select>

                      {quizQuestions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(qIdx)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Delete Question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={q.questionText}
                      onChange={(e) => {
                        const updated = [...quizQuestions];
                        updated[qIdx].questionText = e.target.value;
                        setQuizQuestions(updated);
                      }}
                      required
                      placeholder="Enter the question text..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>

                  {/* MCQ Options Rendering */}
                  {currentType === 'MCQ' && (
                    <div className="space-y-2">
                      <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Options (select radio for correct answer):
                      </span>
                      {(q.options || ['', '', '', '']).map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-slate-200">
                          <input
                            type="radio"
                            name={`correct_opt_${qIdx}`}
                            checked={Number(q.correctAnswerIndex) === optIdx}
                            onChange={() => {
                              const updated = [...quizQuestions];
                              updated[qIdx].correctAnswerIndex = optIdx;
                              updated[qIdx].correctAnswerText = opt;
                              setQuizQuestions(updated);
                            }}
                            className="text-amber-600 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const updated = [...quizQuestions];
                              if (!updated[qIdx].options) updated[qIdx].options = ['', '', '', ''];
                              updated[qIdx].options[optIdx] = e.target.value;
                              if (Number(updated[qIdx].correctAnswerIndex) === optIdx) {
                                updated[qIdx].correctAnswerText = e.target.value;
                              }
                              setQuizQuestions(updated);
                            }}
                            placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                            className="flex-1 bg-transparent border-none text-xs text-slate-900 outline-none focus:ring-0"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* True / False Field Rendering */}
                  {currentType === 'TRUE_FALSE' && (
                    <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-2">
                      <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Select Correct Answer:</span>
                      <div className="flex space-x-4">
                        <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name={`tf_correct_${qIdx}`}
                            checked={Number(q.correctAnswerIndex) === 0}
                            onChange={() => {
                              const updated = [...quizQuestions];
                              updated[qIdx].correctAnswerIndex = 0;
                              updated[qIdx].correctAnswerText = 'True';
                              setQuizQuestions(updated);
                            }}
                            className="text-amber-600 cursor-pointer"
                          />
                          <span>True</span>
                        </label>
                        <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name={`tf_correct_${qIdx}`}
                            checked={Number(q.correctAnswerIndex) === 1}
                            onChange={() => {
                              const updated = [...quizQuestions];
                              updated[qIdx].correctAnswerIndex = 1;
                              updated[qIdx].correctAnswerText = 'False';
                              setQuizQuestions(updated);
                            }}
                            className="text-amber-600 cursor-pointer"
                          />
                          <span>False</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Fill in the Blank Field Rendering */}
                  {currentType === 'FILL_IN_BLANK' && (
                    <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Correct Answer Text:</label>
                      <input
                        type="text"
                        value={q.correctAnswerText || ''}
                        onChange={(e) => {
                          const updated = [...quizQuestions];
                          updated[qIdx].correctAnswerText = e.target.value;
                          setQuizQuestions(updated);
                        }}
                        placeholder="Enter expected correct text (evaluation is case-insensitive)..."
                        className="w-full px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-900 outline-none"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3 sticky bottom-0 bg-white py-2">
            <button
              type="button"
              onClick={() => setShowQuizModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 text-white cursor-pointer hover:bg-amber-700"
            >
              Save Section Quiz
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
