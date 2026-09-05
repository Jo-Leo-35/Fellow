import type { GovernmentCountsView, GovernmentDashboardView, TeacherCountsView, TeacherRosterStudentView } from '@/types/view';
import { governmentTopics, percentageChange, type GovernmentDashboard } from '@/data/governmentDashboard';
import type { TeacherTopic } from '@/data/teacherDashboard';
export type StudentSummary = Omit<TeacherRosterStudentView,'mainTopic'> & {id:string; accuracy:number|null; mainTopic:TeacherTopic|undefined;animationCount:number};
export const emptyTeacherCounts:TeacherCountsView={questionCount:0,activeStudentCount:0,rosterStudentCount:0,attentionCount:0,practiceCount:0,correctCount:0,gapCount:0,animationCompletedCount:0,animationObservationCount:0,accuracyPercentage:null,animationCompletionPercentage:null};
const counts=(x:GovernmentCountsView)=>({events:x.eventCount,needs:x.resourceNeedCount,potential:x.potentialNeedCount,views:x.resourceViewCount});
const zero={events:0,needs:0,potential:0,views:0};
export const emptyGovernment:GovernmentDashboard={window:{days:0,start:'',end:'',previousStart:'',previousEnd:''},totals:zero,previousTotals:zero,topics:[],regions:[],trend:[],current:[],insightTopic:undefined as unknown as GovernmentDashboard['insightTopic']};
export function governmentPresentation(snapshot:GovernmentDashboardView):GovernmentDashboard {
 const topics=snapshot.topics.map(item=>({...governmentTopics.find(x=>x.id===item.topic)!,label:item.label,education:item.education,...counts(item),previous:counts(item.previous),percentage:item.percentage}));
 const insightId=snapshot.agentInsights[0]?.topic;
 return {window:{days:snapshot.window.days,start:snapshot.window.startDate,end:snapshot.window.endDate,previousStart:snapshot.window.previousStartDate,previousEnd:snapshot.window.previousEndDate},totals:counts(snapshot.totals),previousTotals:counts(snapshot.previousTotals),topics:topics as GovernmentDashboard['topics'],regions:snapshot.regions.map(item=>({district:item.region,...counts(item),previous:counts(item.previous)})),trend:snapshot.trend.map(item=>({start:item.startDate,end:item.endDate,label:item.label,...counts(item),previous:counts(item.previous)})),current:snapshot.dailyAggregates.map(item=>({date:item.date,district:item.region,topic:item.topic,...counts(item)})),insightTopic:(topics.find(item=>item.id===insightId)??[...topics].filter(item=>item.needs>0).sort((a,b)=>percentageChange(b.needs,b.previous.needs)-percentageChange(a.needs,a.previous.needs))[0]) as GovernmentDashboard['insightTopic']};
}
export function governmentSnapshotCsv(data:GovernmentDashboard) {
 const headers=['期間開始','期間結束','地區','主要主題','互動事件','資源需求','待關注需求','已開啟資源需求'];
 const grouped=new Map<string,{district:string;topic:string;events:number;needs:number;potential:number;views:number}>();
 for(const row of data.current){const key=`${row.district}:${row.topic}`;const entry=grouped.get(key)??{district:row.district,topic:row.topic,...zero};entry.events+=row.events;entry.needs+=row.needs;entry.potential+=row.potential;entry.views+=row.views;grouped.set(key,entry);}
 const rows=[headers,...[...grouped.values()].map(row=>[data.window.start,data.window.end,`${row.district}區`,governmentTopics.find(topic=>topic.id===row.topic)?.label??row.topic,row.events,row.needs,row.potential,row.views])];
 return '\uFEFF'+rows.map(row=>row.map(value=>`"${String(value).replaceAll('"','""')}"`).join(',')).join('\r\n');
}
