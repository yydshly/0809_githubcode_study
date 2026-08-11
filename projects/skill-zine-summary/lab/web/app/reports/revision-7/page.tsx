import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/app/components/SiteHeader";
import { revision7CapabilityExplorationsBySlug } from "@/app/data/revision7-capability-explorations";
import { skillBySlug, skills } from "@/app/data/skills";

export const metadata: Metadata = {
  title: "Revision 7 跨题材能力研究报告",
  description: "7 张来源如何驱动 12 个 Zine Skill 的 24 组能力实验、结论、边界与真实生产下一步。",
};

const reportSkills = skills.filter((skill) => revision7CapabilityExplorationsBySlug[skill.slug]);
const reportCases = reportSkills.flatMap((skill) => revision7CapabilityExplorationsBySlug[skill.slug]);

export default function Revision7ReportPage() {
  return (
    <main>
      <SiteHeader />
      <section className="revision-report-hero">
        <div>
          <p className="eyebrow">REVISION 7 · CROSS-SUBJECT CAPABILITY REPORT</p>
          <h1>不是多放图片，<br />而是用新输入追问能力。</h1>
        </div>
        <div>
          <p className="revision-report-hero__summary">这轮复用 7 张可控来源，为 Photo Distill 之外的 12 个 Skill 各设计 2 个不同角度的问题，形成 24 组 SOURCE → EFFECT 对照、24 个明确结论和 24 组轻量产品数字预演。</p>
          <Link className="button" href="/research">返回研究总索引</Link>
        </div>
      </section>

      <section className="revision-report__stats" aria-label="Revision 7 数量口径">
        <div><strong>7</strong><span>张可控来源，被跨 Skill 复用</span></div>
        <div><strong>{reportSkills.length}</strong><span>个独立 Skill 研究目标</span></div>
        <div><strong>{reportCases.length}</strong><span>组新的能力问题与效果</span></div>
        <div><strong>19/5</strong><span>成立／部分成立；另有 24 组产品数字预演</span></div>
      </section>

      <article className="revision-report">
        <section className="revision-report__intro" aria-labelledby="report-method-title">
          <div>
            <p className="eyebrow">WHAT WAS ACTUALLY DONE</p>
            <h2 id="report-method-title">具体做了什么</h2>
          </div>
          <div className="revision-report__intro-copy">
            <p>不是为每个页面机械增加同类图，也不是直接运行上游 Skill 后收集结果。我们先选择人物、多人关系、静物、建筑、交通和季节系列等来源，再提取每个 Skill 的核心视觉规则，用本地概念效果检查这种规则换题材后是否仍成立。每组都公开结果、损失、未证明事项，以及进入真实生产还缺什么。</p>
            <ol className="revision-report__method">
              <li><b>01</b><strong>提出新问题</strong><p>让输入覆盖与原基线不同的主体、复杂度或产品任务。</p></li>
              <li><b>02</b><strong>按规则重构</strong><p>只使用对应 Skill 的关系语法、材料语言或版式契约。</p></li>
              <li><b>03</b><strong>完整对照</strong><p>并排查看完整 SOURCE 与 EFFECT，记录保留、丢失和生成错误。</p></li>
              <li><b>04</b><strong>落到应用边界</strong><p>用网页数字预演解释用途，并列出真正生产前的确定性处理。</p></li>
            </ol>
          </div>
        </section>

        <section className="revision-report__evidence" aria-label="五种证据等级">
          <div><strong>UPSTREAM DEMO</strong><p>上游作者公开样例，只说明其原始仓库展示过什么。</p></div>
          <div><strong>LOCAL EFFECT</strong><p>依据本地来源与 Skill 规则生成的概念研究，不是上游官方输出。</p></div>
          <div><strong>CODE-NATIVE</strong><p>确定性 SVG、Canvas 或脚本结果，可检查规则与渲染行为。</p></div>
          <div><strong>PRODUCT PREVIEW</strong><p>同一 EFFECT 在 HTML/CSS 产品画布和环境中的数字预演。</p></div>
          <div><strong>PRODUCTION PROOF</strong><p>真实印刷、客户部署或现场验证；本轮没有把数字预演冒充这一层。</p></div>
        </section>

        <section className="revision-report__matrix" aria-labelledby="report-matrix-title">
          <header className="revision-report__matrix-head">
            <div><p className="eyebrow">12 SKILLS · 24 CASES</p><h2 id="report-matrix-title">逐 Skill 研究结论</h2></div>
            <p>“成立”只表示本地概念研究回答了当前问题；“部分成立”表示效果存在重要损失或产品证据尚不充分。它们都不是对上游质量的排名。</p>
          </header>

          {reportSkills.map((skill, skillIndex) => {
            const entries = revision7CapabilityExplorationsBySlug[skill.slug];
            const knownSkill = skillBySlug.get(skill.slug);
            return (
              <section className="revision-report__skill" id={skill.slug} data-report-skill={skill.slug} key={skill.slug}>
                <header className="revision-report__skill-head">
                  <span>{String(skillIndex + 1).padStart(2, "0")}</span>
                  <div><h3>{knownSkill?.name ?? skill.name}</h3><p>{skill.slug} · TWO CAPABILITY QUESTIONS</p></div>
                  <Link href={`/skills/${skill.slug}#capability-explorations`}>查看完整图片对照</Link>
                </header>
                <div className="revision-report__cases">
                  {entries.map((entry) => {
                    const conclusion = entry.conclusion;
                    if (!conclusion) return null;
                    return (
                      <article className="revision-report__case" data-report-case={entry.id} data-status={conclusion.status} key={entry.id}>
                        <header className="revision-report__case-head"><h4>{entry.title}</h4><span>{conclusion.status}</span></header>
                        <p className="revision-report__case-action"><strong>本组做法：</strong>{conclusion.action}</p>
                        <dl>
                          <div><dt>实际结果</dt><dd>{conclusion.finding}</dd></div>
                          <div><dt>证明了什么</dt><dd>{conclusion.proves}</dd></div>
                          <div><dt>没有证明什么</dt><dd>{conclusion.doesNotProve}</dd></div>
                          <div><dt>真实生产下一步</dt><dd>{conclusion.productionNext}</dd></div>
                        </dl>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </section>

        <section className="revision-report__boundaries">
          <div><p className="eyebrow">BOUNDARIES</p><h2>这份报告没有冒充什么</h2></div>
          <ul>
            <li>24 张 EFFECT 是本地概念研究，不是 12 个上游 Skill 的实际官方运行输出。</li>
            <li>产品预演复用同一 EFFECT，只说明可能的画布和环境，不是新增效果、实体样品、客户项目或部署照片。</li>
            <li>五人聚会在 GC 与 Pixel 结果中都出现成员损失；报告把它标为限制，而不是“主动简化”的成功。</li>
            <li>生成式照片窗不等于源文件像素锁定；需要照片保真时必须改用确定性嵌入和校验。</li>
            <li>Revision 7 形成时资产仅用于本地研究；当前公开研究站保留来源与许可说明，但公开访问不扩大任何上游授权。</li>
          </ul>
        </section>
      </article>
    </main>
  );
}
