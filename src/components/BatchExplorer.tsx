import React, { useState, useEffect } from 'react';
import { ChevronLeft, Play, FileText, Download, Lock, BookOpen, Layers, Calendar } from 'lucide-react';
import TestPlayer from './TestPlayer';
import WeeklyPlanner from './WeeklyPlanner';
import { 
  getSubjectTopics, 
  getVideosForChapter, 
  getNotesForChapter,
  getDppQuestions,
  getDppVideos,
  getBatchQuizzes,
  getSubjectDPPTests,
  getBatchAddons
} from '../services/api';

interface BatchExplorerProps {
  batch: any;
  onBack: () => void;
}

const BatchExplorer: React.FC<BatchExplorerProps> = ({ batch, onBack }) => {
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [contents, setContents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'videos' | 'notes' | 'dpp' | 'tests'>('videos');
  const [batchViewTab, setBatchViewTab] = useState<'subjects' | 'weekly' | 'khazana'>('subjects');
  const [addons, setAddons] = useState<any[]>([]);
  const [showTestPlayer, setShowTestPlayer] = useState(false);
  const [activeTest, setActiveTest] = useState<any>(null);

  const subjects = batch?.subjects || [];

  // Fetch Topics when subject changes
  useEffect(() => {
    if (selectedSubject) {
      fetchTopics();
      setSelectedTopic(null);
      setContents([]);
    }
  }, [selectedSubject]);

  // Fetch Content when topic or tab changes
  useEffect(() => {
    if (selectedTopic) {
      fetchTopicContent();
    }
  }, [selectedTopic, activeTab]);

  useEffect(() => {
    if (batchViewTab === 'khazana') {
      fetchAddons();
    }
  }, [batchViewTab]);

  const fetchAddons = async () => {
    setLoading(true);
    const token = localStorage.getItem('pw_token');
    const bId = batch._id || batch.id;
    if (token && bId) {
      const data = await getBatchAddons(token, bId);
      setAddons(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  };

  const fetchTopics = async () => {
    setLoading(true);
    const token = localStorage.getItem('pw_token');
    if (token && batch) {
      const res = await getSubjectTopics(token, batch.slug, selectedSubject.slug);
      if (res.success) {
        setTopics(res.data);
      }
    }
    setLoading(false);
  };

  const fetchTopicContent = async () => {
    setLoading(true);
    const token = localStorage.getItem('pw_token');
    const bId = batch._id || batch.id;
    const sId = selectedSubject._id || selectedSubject.id;

    if (token && batch && selectedTopic) {
      let data: any = { data: [] };
      if (activeTab === 'videos') {
        data = await getVideosForChapter(token, batch.slug, selectedSubject.slug, selectedTopic.slug);
      } else if (activeTab === 'notes') {
        data = await getNotesForChapter(token, batch.slug, selectedSubject.slug, selectedTopic.slug);
      } else if (activeTab === 'dpp') {
        const [q, v] = await Promise.all([
          getDppQuestions(token, batch.slug, selectedSubject.slug, selectedTopic.slug),
          getDppVideos(token, batch.slug, selectedSubject.slug, selectedTopic.slug)
        ]);
        const qData = Array.isArray(q?.data) ? q.data : [];
        const vData = Array.isArray(v?.data) ? v.data : [];
        data = { data: [...qData, ...vData] };
      } else if (activeTab === 'tests') {
        const [quizzes, dppTests] = await Promise.all([
          getBatchQuizzes(token, bId, sId),
          getSubjectDPPTests(token, bId, sId)
        ]);
        
        // Map tests/quizzes to a consistent format for display
        const quizzesArray = Array.isArray(quizzes) ? quizzes : [];
        const dppTestsArray = Array.isArray(dppTests) ? dppTests : [];
        
        const combined = [
          ...quizzesArray.map((q: any) => ({
            ...q,
            topic: q.testName || q.name || q.testTitle || q.title || q.topic || q.testDetails?.name || q.exerciseName || q.exerciseDetails?.name || 'Untitled Test',
            questionsCount: q.totalQuestions || q.questionsCount || q.questionCount || q.testDetails?.totalQuestions || q.test?.totalQuestions || 0,
            duration: q.duration || q.timeDuration || q.timing || q.testDetails?.duration || q.test?.duration || 0,
            isTest: true,
            testType: 'Quiz'
          })),
          ...dppTestsArray.map((t: any) => ({
            ...t,
            topic: t.testName || t.name || t.testTitle || t.topic || t.title || t.testDetails?.name || t.exerciseName || t.exerciseDetails?.name || 'Untitled DPP Test',
            questionsCount: t.totalQuestions || t.questionsCount || t.questionCount || t.testDetails?.totalQuestions || t.test?.totalQuestions || 0,
            duration: t.duration || t.timeDuration || t.timing || t.testDetails?.duration || t.test?.duration || 0,
            isTest: true,
            testType: 'DPP Test'
          }))
        ];
        data = { data: combined };
      }
      setContents(data.data || []);
    }
    setLoading(false);
  };

  const handleContentAction = (item: any) => {
    const token = localStorage.getItem('pw_token');
    const bId = batch._id || batch.id;
    const sId = selectedSubject?._id || selectedSubject?.id;

    if (item.videoDetails) {
      const videoUrl = item.videoDetails.videoUrl;
      if (videoUrl) {
        const playerUrl = `https://anonymouspwplayerr-3cfbfedeb317.herokuapp.com/pw?url=${encodeURIComponent(videoUrl)}&token=${token}&parent_id=${bId}&child_id=${sId}`;
        window.open(playerUrl, '_blank');
      }
    } else if (item.pdfUrl) {
      window.open(item.pdfUrl, '_blank');
    } else if (item.isTest) {
      setActiveTest(item);
      setShowTestPlayer(true);
    }
  };

  return (
    <div className="space-y-6">
      {showTestPlayer && activeTest && (
        <TestPlayer 
          test={activeTest}
          batchId={batch._id || batch.id}
          subjectId={selectedSubject?._id || selectedSubject?.id}
          onClose={() => setShowTestPlayer(false)}
        />
      )}
      <div className="flex items-center gap-4">
        <button 
          onClick={selectedTopic ? () => setSelectedTopic(null) : (selectedSubject ? () => setSelectedSubject(null) : onBack)}
          className="p-2 hover:bg-white rounded-full transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-headings" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-headings">
            {selectedTopic ? (selectedTopic.topic || selectedTopic.name || selectedTopic.title) : (selectedSubject ? (selectedSubject.subject || selectedSubject.name) : batch.name)}
          </h2>
          <p className="text-xs text-body-2">
            {selectedTopic ? 'Study Materials' : (selectedSubject ? 'Select a Chapter' : 'Explore subjects and content')}
          </p>
        </div>
      </div>

      {!selectedSubject && (
        <div className="flex border-b border-stroke-light mb-6">
          <button 
            onClick={() => setBatchViewTab('subjects')}
            className={`px-6 py-3 text-sm font-bold transition-all relative ${batchViewTab === 'subjects' ? 'text-primary' : 'text-body-2 hover:text-headings'}`}
          >
            Subjects
            {batchViewTab === 'subjects' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
          </button>
          <button 
            onClick={() => setBatchViewTab('khazana')}
            className={`px-6 py-3 text-sm font-bold transition-all relative flex items-center gap-2 ${batchViewTab === 'khazana' ? 'text-primary' : 'text-body-2 hover:text-headings'}`}
          >
            <Layers size={16} />
            Khazana
            {batchViewTab === 'khazana' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
          </button>
          <button 
            onClick={() => setBatchViewTab('weekly')}
            className={`px-6 py-3 text-sm font-bold transition-all relative flex items-center gap-2 ${batchViewTab === 'weekly' ? 'text-primary' : 'text-body-2 hover:text-headings'}`}
          >
            <Calendar size={16} />
            Weekly Schedule
            {batchViewTab === 'weekly' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
          </button>
        </div>
      )}

      {!selectedSubject ? (
        batchViewTab === 'subjects' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((sub: any) => (
            <div 
              key={sub._id || sub.slug}
              onClick={() => setSelectedSubject(sub)}
              className="bg-white p-6 rounded-2xl border border-stroke-light hover:border-primary hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-all overflow-hidden border border-primary/5">
                {(sub.imageId || sub.image) ? (
                  <img 
                    src={typeof sub.imageId === 'string' ? sub.imageId : (sub.imageId?.baseUrl ? `${sub.imageId.baseUrl}${sub.imageId.key}` : sub.image)} 
                    alt="" 
                    referrerPolicy="no-referrer" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <BookOpen className="w-8 h-8 text-primary" />
                )}
              </div>
              <h3 className="font-bold text-headings text-lg mb-1">{sub.subject || sub.name}</h3>
              <p className="text-xs text-body-2">{sub.tagCount || 0} Chapters available</p>
            </div>
          ))}
        </div>
        ) : batchViewTab === 'khazana' ? (
          <div className="space-y-4">
             {loading ? (
               <div className="py-20 flex justify-center">
                 <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
               </div>
             ) : addons.length > 0 ? (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                 {addons.map((addon, idx) => (
                   <div 
                    key={idx}
                    className="bg-white p-6 rounded-2xl border border-stroke-light hover:border-primary hover:shadow-lg transition-all cursor-pointer group flex flex-col items-center text-center"
                   >
                     <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                       <img src="https://static.pw.live/study-mf/assets/svg/khazana-android-1764087133.svg" className="w-12 h-12" alt={addon.type} />
                     </div>
                     <h3 className="font-bold text-headings text-lg capitalize">{addon.type.toLowerCase()}</h3>
                     <p className="text-xs text-body-2 mt-1">Unlock premium content with {addon.type}</p>
                     <button className="mt-6 px-6 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:shadow-md transition-shadow">
                       Open {addon.type}
                     </button>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="bg-white rounded-2xl border border-stroke-light p-20 text-center">
                 <Lock className="w-10 h-10 text-body-2/30 mx-auto mb-4" />
                 <h3 className="text-lg font-bold text-headings">No Addons found</h3>
                 <p className="text-sm text-body-2">Khazana and Saarthi are currently unavailable for this batch.</p>
               </div>
             )}
          </div>
        ) : (
          <WeeklyPlanner batchId={batch._id || batch.id} />
        )
      ) : !selectedTopic ? (
        <div className="space-y-4">
          {loading ? (
            <div className="py-20 flex justify-center">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : topics.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {topics.map((topic, idx) => (
                <div 
                  key={idx}
                  onClick={() => setSelectedTopic(topic)}
                  className="bg-white p-4 rounded-xl border border-stroke-light hover:border-primary transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-tertiary-6 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-primary/5 transition-colors overflow-hidden border border-stroke-light">
                      {(topic.imageUrl || topic.image || topic.imageId) ? (
                        <img 
                          src={typeof (topic.imageUrl || topic.image || topic.imageId) === 'string' ? (topic.imageUrl || topic.image || topic.imageId) : ((topic.imageUrl || topic.image || topic.imageId)?.baseUrl ? `${(topic.imageUrl || topic.image || topic.imageId).baseUrl}${(topic.imageUrl || topic.image || topic.imageId).key}` : '')} 
                          alt="" 
                          referrerPolicy="no-referrer" 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <Layers className="w-5 h-5 text-body-2 group-hover:text-primary" />
                      )}
                    </div>
                    <h4 className="font-bold text-headings text-sm line-clamp-1">{topic.topic || topic.name || topic.title || 'Chapter Name Not Available'}</h4>
                  </div>
                  <div className="flex items-center gap-2 text-body-2 text-xs font-medium">
                    <span>{(() => {
                      const total = (topic.count || topic.totalContents || topic.contentsCount || 0) || 
                                   ((topic.videosCount || 0) + (topic.notesCount || 0) + (topic.exercisesCount || 0) + (topic.testsCount || 0));
                      return total > 0 ? `${total} items` : 'View';
                    })()}</span>
                    <ChevronLeft className="w-4 h-4 rotate-180" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stroke-light p-20 text-center">
              <Lock className="w-10 h-10 text-body-2/30 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-headings">No chapters found</h3>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-stroke-light overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {(['videos', 'notes', 'dpp', 'tests'] as const).map((tab) => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2 rounded-lg font-bold text-sm transition-all capitalize ${activeTab === tab ? 'bg-primary text-white shadow-md' : 'text-body-2 hover:bg-tertiary-6'}`}
                >
                  {tab === 'dpp' ? 'DPP' : tab}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : contents.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {contents.map((item, idx) => (
                <div 
                  key={idx} 
                  onClick={() => handleContentAction(item)}
                  className="bg-white p-4 rounded-xl border border-stroke-light hover:border-primary/30 transition-all flex flex-col sm:flex-row gap-4 group cursor-pointer"
                >
                  <div className="w-full sm:w-48 aspect-video rounded-lg overflow-hidden bg-tertiary-6 shrink-0 relative">
                    <div className="w-full h-full bg-primary/5 flex items-center justify-center">
                      {(item.videoDetails?.image || item.imageUrl) ? (
                        <img 
                          src={item.videoDetails?.image || item.imageUrl} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                          alt="" 
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <img 
                            src="https://www.image2url.com/r2/default/images/1776957997005-fdbd026d-c585-491c-bf1f-68e5be13b6ec.png" 
                            className="w-12 h-12" 
                            alt="PDF" 
                          />
                        </div>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center">
                        {item.videoDetails ? <Play className="w-6 h-6 fill-current" /> : <FileText className="w-6 h-6" />}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="px-2 py-0.5 bg-tertiary-6 text-body-2 text-[10px] font-bold rounded uppercase">
                         {item.isTest ? item.testType : (item.videoDetails ? 'Video' : 'PDF Notes')}
                       </span>
                    </div>
                    <h4 className="font-bold text-headings text-sm sm:text-base line-clamp-2 group-hover:text-primary transition-colors">
                      {item.topic || item.pdfName || item.testName || item.testTitle || item.name || item.title || 'Untitled Content'}
                    </h4>
                    {(item.note || item.description) && (
                      <p className="text-xs text-body-2 mt-2 line-clamp-2">{item.note || item.description}</p>
                    )}
                    {item.videoDetails?.duration && (
                      <p className="text-xs text-body-2 mt-2">Duration: {item.videoDetails.duration}</p>
                    )}
                    {item.isTest && (
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-[10px] bg-primary/5 text-primary px-2 py-0.5 rounded font-bold">
                          {item.questionsCount || 0} Questions
                        </span>
                        <span className="text-[10px] bg-primary/5 text-primary px-2 py-0.5 rounded font-bold">
                          {item.duration || 0} Mins
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex sm:flex-col justify-end gap-2 shrink-0">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContentAction(item);
                      }}
                      className="flex-1 sm:flex-none px-6 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
                    >
                      {item.isTest ? 'Start Test' : (item.videoDetails ? 'Watch' : 'View PDF')}
                    </button>
                    {!item.videoDetails && !item.isTest && (
                      <button className="p-2 border border-stroke-light rounded-lg text-body-2 hover:bg-tertiary-6 transition-colors hidden sm:block">
                        <Download className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stroke-light p-20 text-center">
              <div className="w-16 h-16 bg-tertiary-6 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-body-2/30" />
              </div>
              <h3 className="text-lg font-bold text-headings mb-1">No material found</h3>
              <p className="text-sm text-body-2">Try checking another tab or chapter.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BatchExplorer;
