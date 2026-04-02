import puppeteer from 'puppeteer';

export class PDFService {
  static async generatePDF(html, template = 'modern') {
    let browser = null;
    try {
      console.log('Generating PDF...');

      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process'
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
      });

      const page = await browser.newPage();

      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 2
      });

      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          bottom: '20px',
          left: '20px',
          right: '20px'
        },
        preferCSSPageSize: true,
      });

      console.log('PDF generated successfully');
      return pdf;

    } catch (error) {
      console.error('PDF Generation error:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  static getResumeHTML(resume, template) {
    const templates = {
      modern: this.modernTemplate,
      classic: this.classicTemplate,
      minimal: this.minimalTemplate,
      executive: this.executiveTemplate
    };

    const templateFn = templates[template] || templates.modern;
    return templateFn(resume);
  }

  static modernTemplate(resume) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${resume.personalInfo?.name || 'Resume'}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: white;
            padding: 40px;
            line-height: 1.5;
          }
          .resume {
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #4F46E5;
          }
          .name {
            font-size: 32px;
            font-weight: bold;
            color: #111827;
            margin-bottom: 8px;
          }
          .title {
            font-size: 18px;
            color: #4F46E5;
            margin-bottom: 15px;
          }
          .contact {
            display: flex;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
            font-size: 14px;
            color: #6B7280;
          }
          .section {
            margin-bottom: 25px;
          }
          .section-title {
            font-size: 20px;
            font-weight: bold;
            color: #111827;
            margin-bottom: 15px;
            padding-bottom: 5px;
            border-bottom: 2px solid #E5E7EB;
          }
          .experience-item, .education-item {
            margin-bottom: 20px;
          }
          .item-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            flex-wrap: wrap;
          }
          .item-title {
            font-weight: bold;
            color: #111827;
          }
          .item-company {
            color: #4F46E5;
          }
          .item-date {
            color: #6B7280;
            font-size: 14px;
          }
          .item-description {
            margin-top: 10px;
            padding-left: 20px;
          }
          .item-description li {
            margin-bottom: 5px;
            color: #374151;
          }
          .skills-list {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }
          .skill-tag {
            background: #F3F4F6;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 14px;
            color: #374151;
          }
          .summary {
            color: #374151;
            margin-bottom: 20px;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="resume">
          <div class="header">
            <div class="name">${this.escapeHtml(resume.personalInfo?.name || 'Your Name')}</div>
            <div class="title">${this.escapeHtml(resume.personalInfo?.title || 'Professional')}</div>
            <div class="contact">
              ${resume.personalInfo?.email ? `<span>📧 ${this.escapeHtml(resume.personalInfo.email)}</span>` : ''}
              ${resume.personalInfo?.phone ? `<span>📱 ${this.escapeHtml(resume.personalInfo.phone)}</span>` : ''}
              ${resume.personalInfo?.location ? `<span>📍 ${this.escapeHtml(resume.personalInfo.location)}</span>` : ''}
            </div>
          </div>
          
          ${resume.personalInfo?.summary ? `
            <div class="section">
              <div class="section-title">Professional Summary</div>
              <div class="summary">${this.escapeHtml(resume.personalInfo.summary)}</div>
            </div>
          ` : ''}
          
          ${resume.experience?.length ? `
            <div class="section">
              <div class="section-title">Experience</div>
              ${resume.experience.map(exp => `
                <div class="experience-item">
                  <div class="item-header">
                    <div>
                      <span class="item-title">${this.escapeHtml(exp.title)}</span>
                      ${exp.company ? `<span class="item-company"> @ ${this.escapeHtml(exp.company)}</span>` : ''}
                    </div>
                    <div class="item-date">
                      ${exp.startDate || ''} ${exp.endDate && !exp.current ? `- ${exp.endDate}` : exp.current ? '- Present' : ''}
                    </div>
                  </div>
                  ${exp.description?.length ? `
                    <ul class="item-description">
                      ${exp.description.map(desc => `<li>${this.escapeHtml(desc)}</li>`).join('')}
                    </ul>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          ${resume.education?.length ? `
            <div class="section">
              <div class="section-title">Education</div>
              ${resume.education.map(edu => `
                <div class="education-item">
                  <div class="item-header">
                    <div>
                      <span class="item-title">${this.escapeHtml(edu.degree)}</span>
                      ${edu.institution ? `<span class="item-company"> @ ${this.escapeHtml(edu.institution)}</span>` : ''}
                    </div>
                    <div class="item-date">${edu.graduationYear || ''}</div>
                  </div>
                  ${edu.gpa ? `<div>GPA: ${edu.gpa}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          ${resume.skills?.length ? `
            <div class="section">
              <div class="section-title">Skills</div>
              <div class="skills-list">
                ${resume.skills.map(skill => `<span class="skill-tag">${this.escapeHtml(skill.name)}</span>`).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </body>
      </html>
    `;
  }

  static escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  static classicTemplate(resume) {
    return this.modernTemplate(resume);
  }

  static minimalTemplate(resume) {
    return this.modernTemplate(resume);
  }

  static executiveTemplate(resume) {
    return this.modernTemplate(resume);
  }
}