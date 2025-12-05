import { db } from './database.js';
import { HubzoneService } from './hubzoneService.js';

// ============ TYPES ============

interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface SalaryRange {
  min: number;
  max: number;
  type: 'hourly' | 'annual';
  currency: string;
}

interface RequiredSkill {
  id: string;
  name: string;
  required: boolean;
  yearsRequired?: number;
}

type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'temporary' | 'internship';
type JobStatus = 'draft' | 'published' | 'closed' | 'filled';
type ApplicationStatus = 'applied' | 'reviewed' | 'shortlisted' | 'interviewing' | 'offered' | 'hired' | 'rejected' | 'withdrawn';

interface JobData {
  title: string;
  description: string;
  responsibilities?: string;
  qualifications?: string;
  benefits?: string;
  hubzoneResidentRequired: boolean;
  skills: RequiredSkill[];
  experienceYears?: number;
  educationRequired?: string;
  salaryRange: SalaryRange;
  employmentType: EmploymentType;
  location: Address;
  isRemote: boolean;
  remotePolicy?: 'fully_remote' | 'hybrid' | 'on_site';
  expiresAt?: string;
}

interface Job extends JobData {
  id: string;
  businessId: string;
  businessName: string;
  businessLogo?: string;
  status: JobStatus;
  applicationCount: number;
  viewCount: number;
  postedAt: string;
  updatedAt: string;
  createdAt: string;
}

interface ApplicationData {
  coverLetter?: string;
  resumeUrl?: string;
  portfolioUrl?: string;
  phone?: string;
  salaryExpectation?: {
    min?: number;
    max?: number;
    type: 'hourly' | 'annual';
  };
  availableStartDate?: string;
}

interface Application {
  id: string;
  jobId: string;
  professionalId: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  coverLetter?: string;
  resumeUrl?: string;
  portfolioUrl?: string;
  status: ApplicationStatus;
  statusHistory: {
    status: ApplicationStatus;
    date: string;
    note?: string;
  }[];
  matchScore: number;
  skillsMatchScore: number;
  experienceScore: number;
  hubzoneScore: number;
  locationScore: number;
  appliedAt: string;
  updatedAt: string;
}

interface MatchScoreBreakdown {
  total: number;
  skills: {
    score: number;
    weight: number;
    matchedSkills: string[];
    missingSkills: string[];
  };
  experience: {
    score: number;
    weight: number;
    yearsRequired: number;
    yearsHave: number;
  };
  hubzone: {
    score: number;
    weight: number;
    isRequired: boolean;
    isResident: boolean;
  };
  location: {
    score: number;
    weight: number;
    distanceMiles: number;
    isRemote: boolean;
  };
}

interface JobFilters {
  search?: string;
  hubzoneOnly?: boolean;
  employmentType?: EmploymentType[];
  salaryMin?: number;
  salaryMax?: number;
  salaryType?: 'hourly' | 'annual';
  state?: string;
  city?: string;
  zipCode?: string;
  radius?: number;
  skills?: string[];
  isRemote?: boolean;
  sortBy?: 'date' | 'salary' | 'match_score';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface Analytics {
  jobId: string;
  views: number;
  applications: number;
  hires: number;
  avgMatchScore: number;
  conversionRate: number;
  viewsPerDay: { date: string; count: number }[];
  applicationsPerDay: { date: string; count: number }[];
}

// ============ MATCH SCORE WEIGHTS ============
const MATCH_WEIGHTS = {
  skills: 0.40,      // 40%
  experience: 0.20,  // 20%
  hubzone: 0.30,     // 30%
  location: 0.10,    // 10%
};

export class JobService {
  private hubzoneService: HubzoneService;

  constructor() {
    this.hubzoneService = new HubzoneService();
  }

  // ============ JOB POSTING METHODS ============

  /**
   * Create a new job posting
   */
  async createJobPosting(businessId: string, jobData: JobData): Promise<Job> {
    // Get business info
    const businessResult = await db.query(
      'SELECT legal_name, logo_url FROM businesses WHERE id = $1',
      [businessId]
    );

    if (businessResult.rows.length === 0) {
      throw new Error('Business not found');
    }

    const business = businessResult.rows[0];

    const result = await db.query(
      `INSERT INTO jobs (
        business_id, business_name, business_logo,
        title, description, responsibilities, qualifications, benefits,
        hubzone_resident_required, skills, experience_years, education_required,
        salary_range, employment_type, location, is_remote, remote_policy,
        status, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'draft', $18)
      RETURNING *`,
      [
        businessId,
        business.legal_name,
        business.logo_url,
        jobData.title,
        jobData.description,
        jobData.responsibilities,
        jobData.qualifications,
        jobData.benefits,
        jobData.hubzoneResidentRequired,
        JSON.stringify(jobData.skills),
        jobData.experienceYears,
        jobData.educationRequired,
        JSON.stringify(jobData.salaryRange),
        jobData.employmentType,
        JSON.stringify(jobData.location),
        jobData.isRemote,
        jobData.remotePolicy,
        jobData.expiresAt,
      ]
    );

    return this.mapRowToJob(result.rows[0]);
  }

  /**
   * Update a job posting
   */
  async updateJobPosting(jobId: string, updates: Partial<JobData>): Promise<Job | null> {
    const updateFields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      updateFields.push(`title = $${paramIndex++}`);
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.responsibilities !== undefined) {
      updateFields.push(`responsibilities = $${paramIndex++}`);
      values.push(updates.responsibilities);
    }
    if (updates.qualifications !== undefined) {
      updateFields.push(`qualifications = $${paramIndex++}`);
      values.push(updates.qualifications);
    }
    if (updates.benefits !== undefined) {
      updateFields.push(`benefits = $${paramIndex++}`);
      values.push(updates.benefits);
    }
    if (updates.hubzoneResidentRequired !== undefined) {
      updateFields.push(`hubzone_resident_required = $${paramIndex++}`);
      values.push(updates.hubzoneResidentRequired);
    }
    if (updates.skills !== undefined) {
      updateFields.push(`skills = $${paramIndex++}`);
      values.push(JSON.stringify(updates.skills));
    }
    if (updates.experienceYears !== undefined) {
      updateFields.push(`experience_years = $${paramIndex++}`);
      values.push(updates.experienceYears);
    }
    if (updates.salaryRange !== undefined) {
      updateFields.push(`salary_range = $${paramIndex++}`);
      values.push(JSON.stringify(updates.salaryRange));
    }
    if (updates.employmentType !== undefined) {
      updateFields.push(`employment_type = $${paramIndex++}`);
      values.push(updates.employmentType);
    }
    if (updates.location !== undefined) {
      updateFields.push(`location = $${paramIndex++}`);
      values.push(JSON.stringify(updates.location));
    }
    if (updates.isRemote !== undefined) {
      updateFields.push(`is_remote = $${paramIndex++}`);
      values.push(updates.isRemote);
    }
    if (updates.remotePolicy !== undefined) {
      updateFields.push(`remote_policy = $${paramIndex++}`);
      values.push(updates.remotePolicy);
    }
    if (updates.expiresAt !== undefined) {
      updateFields.push(`expires_at = $${paramIndex++}`);
      values.push(updates.expiresAt);
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(jobId);

    const result = await db.query(
      `UPDATE jobs SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;
    return this.mapRowToJob(result.rows[0]);
  }

  /**
   * Delete a job posting
   */
  async deleteJobPosting(jobId: string): Promise<boolean> {
    const result = await db.query('DELETE FROM jobs WHERE id = $1', [jobId]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get job postings with filters
   */
  async getJobPostings(filters: JobFilters, professionalId?: string): Promise<PaginatedResult<Job>> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const whereConditions = ["status = 'published'"];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.search) {
      whereConditions.push(`(
        title ILIKE $${paramIndex} OR 
        description ILIKE $${paramIndex} OR 
        business_name ILIKE $${paramIndex}
      )`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.hubzoneOnly) {
      whereConditions.push('hubzone_resident_required = true');
    }

    if (filters.employmentType && filters.employmentType.length > 0) {
      whereConditions.push(`employment_type = ANY($${paramIndex++}::text[])`);
      params.push(filters.employmentType);
    }

    if (filters.state) {
      whereConditions.push(`location->>'state' = $${paramIndex++}`);
      params.push(filters.state);
    }

    if (filters.city) {
      whereConditions.push(`location->>'city' ILIKE $${paramIndex++}`);
      params.push(`%${filters.city}%`);
    }

    if (filters.isRemote !== undefined) {
      whereConditions.push(`is_remote = $${paramIndex++}`);
      params.push(filters.isRemote);
    }

    if (filters.salaryMin) {
      whereConditions.push(`(salary_range->>'min')::numeric >= $${paramIndex++}`);
      params.push(filters.salaryMin);
    }

    if (filters.salaryMax) {
      whereConditions.push(`(salary_range->>'max')::numeric <= $${paramIndex++}`);
      params.push(filters.salaryMax);
    }

    if (filters.skills && filters.skills.length > 0) {
      whereConditions.push(`EXISTS (
        SELECT 1 FROM jsonb_array_elements(skills) AS skill
        WHERE skill->>'name' = ANY($${paramIndex++}::text[])
      )`);
      params.push(filters.skills);
    }

    const whereClause = whereConditions.join(' AND ');

    // Determine sort order
    let orderBy = 'posted_at DESC';
    if (filters.sortBy === 'salary') {
      orderBy = `(salary_range->>'max')::numeric ${filters.sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
    } else if (filters.sortBy === 'date') {
      orderBy = `posted_at ${filters.sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
    }

    // Count query
    const countResult = await db.query(
      `SELECT COUNT(*) FROM jobs WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Data query
    params.push(limit, offset);
    const dataResult = await db.query(
      `SELECT * FROM jobs WHERE ${whereClause} ORDER BY ${orderBy} LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    // Calculate match scores if professional ID provided
    let jobs = dataResult.rows.map((row: Record<string, unknown>) => this.mapRowToJob(row));

    if (professionalId) {
      jobs = await Promise.all(
        jobs.map(async (job) => {
          const matchScore = await this.calculateMatchScore(professionalId, job.id);
          return { ...job, matchScore: matchScore.total };
        })
      );

      // Sort by match score if requested
      if (filters.sortBy === 'match_score') {
        jobs.sort((a, b) =>
          filters.sortOrder === 'asc'
            ? (a as Job & { matchScore: number }).matchScore - (b as Job & { matchScore: number }).matchScore
            : (b as Job & { matchScore: number }).matchScore - (a as Job & { matchScore: number }).matchScore
        );
      }
    }

    return {
      data: jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single job posting by ID
   */
  async getJobPosting(jobId: string): Promise<Job | null> {
    // Increment view count
    await db.query('UPDATE jobs SET view_count = view_count + 1 WHERE id = $1', [jobId]);

    // Record analytics
    await this.recordJobView(jobId);

    const result = await db.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
    if (result.rows.length === 0) return null;
    return this.mapRowToJob(result.rows[0]);
  }

  /**
   * Publish a job posting
   */
  async publishJob(jobId: string): Promise<Job | null> {
    const result = await db.query(
      `UPDATE jobs 
       SET status = 'published', posted_at = NOW(), updated_at = NOW() 
       WHERE id = $1 AND status = 'draft'
       RETURNING *`,
      [jobId]
    );
    if (result.rows.length === 0) return null;
    return this.mapRowToJob(result.rows[0]);
  }

  /**
   * Close a job posting
   */
  async closeJob(jobId: string): Promise<Job | null> {
    const result = await db.query(
      `UPDATE jobs SET status = 'closed', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [jobId]
    );
    if (result.rows.length === 0) return null;
    return this.mapRowToJob(result.rows[0]);
  }

  // ============ APPLICATION METHODS ============

  /**
   * Apply to a job
   */
  async applyToJob(
    professionalId: string,
    jobId: string,
    applicationData: ApplicationData
  ): Promise<Application> {
    // Get professional info
    const professionalResult = await db.query(
      'SELECT first_name, last_name, email, phone, verification_status FROM professionals WHERE id = $1',
      [professionalId]
    );

    if (professionalResult.rows.length === 0) {
      throw new Error('Professional not found');
    }

    const professional = professionalResult.rows[0];

    // Check if already applied
    const existingResult = await db.query(
      'SELECT id FROM applications WHERE professional_id = $1 AND job_id = $2',
      [professionalId, jobId]
    );

    if (existingResult.rows.length > 0) {
      throw new Error('You have already applied to this job');
    }

    // Calculate match score
    const matchScore = await this.calculateMatchScore(professionalId, jobId);

    // Create application
    const result = await db.query(
      `INSERT INTO applications (
        job_id, professional_id,
        applicant_name, applicant_email, applicant_phone,
        cover_letter, resume_url, portfolio_url,
        status, status_history,
        match_score, skills_match_score, experience_score, hubzone_score, location_score,
        salary_expectation, available_start_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'applied', $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        jobId,
        professionalId,
        `${professional.first_name} ${professional.last_name}`,
        professional.email,
        applicationData.phone || professional.phone,
        applicationData.coverLetter,
        applicationData.resumeUrl,
        applicationData.portfolioUrl,
        JSON.stringify([{ status: 'applied', date: new Date().toISOString() }]),
        matchScore.total,
        matchScore.skills.score,
        matchScore.experience.score,
        matchScore.hubzone.score,
        matchScore.location.score,
        applicationData.salaryExpectation ? JSON.stringify(applicationData.salaryExpectation) : null,
        applicationData.availableStartDate,
      ]
    );

    // Update job application count
    await db.query(
      'UPDATE jobs SET application_count = application_count + 1 WHERE id = $1',
      [jobId]
    );

    // Record analytics
    await this.recordApplication(jobId, professionalId);

    // Send notification to business (would integrate with notification service)
    await this.notifyNewApplication(jobId, professionalId);

    return this.mapRowToApplication(result.rows[0]);
  }

  /**
   * Update application status
   */
  async updateApplicationStatus(
    applicationId: string,
    status: ApplicationStatus,
    note?: string
  ): Promise<Application | null> {
    // Get current application
    const currentResult = await db.query(
      'SELECT status_history, job_id, professional_id FROM applications WHERE id = $1',
      [applicationId]
    );

    if (currentResult.rows.length === 0) return null;

    const currentApp = currentResult.rows[0];
    const statusHistory = typeof currentApp.status_history === 'string'
      ? JSON.parse(currentApp.status_history)
      : currentApp.status_history || [];

    // Add new status to history
    statusHistory.push({
      status,
      date: new Date().toISOString(),
      note,
    });

    const result = await db.query(
      `UPDATE applications 
       SET status = $1, status_history = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, JSON.stringify(statusHistory), applicationId]
    );

    // Record hire if applicable
    if (status === 'hired') {
      await this.recordHire(currentApp.job_id, currentApp.professional_id);
    }

    // Notify professional of status change
    await this.notifyStatusChange(currentApp.professional_id, currentApp.job_id, status);

    return this.mapRowToApplication(result.rows[0]);
  }

  /**
   * Get applications for a professional
   */
  async getProfessionalApplications(
    professionalId: string,
    filters?: { status?: string; page?: number; limit?: number }
  ): Promise<PaginatedResult<Application & { job: Job }>> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const offset = (page - 1) * limit;

    const whereConditions = ['a.professional_id = $1'];
    const params: unknown[] = [professionalId];
    let paramIndex = 2;

    if (filters?.status) {
      whereConditions.push(`a.status = $${paramIndex++}`);
      params.push(filters.status);
    }

    const whereClause = whereConditions.join(' AND ');

    const countResult = await db.query(
      `SELECT COUNT(*) FROM applications a WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit, offset);
    const dataResult = await db.query(
      `SELECT a.*, j.*,
        a.id as application_id, j.id as job_id
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE ${whereClause}
       ORDER BY a.applied_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    const applications = dataResult.rows.map((row: Record<string, unknown>) => ({
      ...this.mapRowToApplication({ ...row, id: row.application_id }),
      job: this.mapRowToJob({ ...row, id: row.job_id }),
    }));

    return {
      data: applications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get applications for a job posting
   */
  async getJobApplications(
    jobId: string,
    filters?: { status?: string; sortBy?: string; page?: number; limit?: number }
  ): Promise<PaginatedResult<Application>> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 12;
    const offset = (page - 1) * limit;

    const whereConditions = ['job_id = $1'];
    const params: unknown[] = [jobId];
    let paramIndex = 2;

    if (filters?.status) {
      whereConditions.push(`status = $${paramIndex++}`);
      params.push(filters.status);
    }

    const whereClause = whereConditions.join(' AND ');

    // Determine sort order
    let orderBy = 'match_score DESC';
    if (filters?.sortBy === 'appliedAt') {
      orderBy = 'applied_at DESC';
    } else if (filters?.sortBy === 'status') {
      orderBy = 'status ASC, applied_at DESC';
    }

    const countResult = await db.query(
      `SELECT COUNT(*) FROM applications WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit, offset);
    const dataResult = await db.query(
      `SELECT * FROM applications WHERE ${whereClause} ORDER BY ${orderBy} LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    return {
      data: dataResult.rows.map((row: Record<string, unknown>) => this.mapRowToApplication(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Withdraw an application
   */
  async withdrawApplication(applicationId: string): Promise<boolean> {
    const result = await db.query(
      `UPDATE applications SET status = 'withdrawn', updated_at = NOW() WHERE id = $1 AND status IN ('applied', 'reviewed', 'shortlisted')`,
      [applicationId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // ============ MATCHING ALGORITHM ============

  /**
   * Calculate match score between a professional and a job
   */
  async calculateMatchScore(professionalId: string, jobId: string): Promise<MatchScoreBreakdown> {
    // Get professional data
    const professionalResult = await db.query(
      `SELECT skills, current_address, verification_status FROM professionals WHERE id = $1`,
      [professionalId]
    );

    if (professionalResult.rows.length === 0) {
      throw new Error('Professional not found');
    }

    // Get job data
    const jobResult = await db.query(
      `SELECT skills, experience_years, hubzone_resident_required, location, is_remote FROM jobs WHERE id = $1`,
      [jobId]
    );

    if (jobResult.rows.length === 0) {
      throw new Error('Job not found');
    }

    const professional = professionalResult.rows[0];
    const job = jobResult.rows[0];

    const professionalSkills = typeof professional.skills === 'string'
      ? JSON.parse(professional.skills)
      : professional.skills || [];

    const jobSkills = typeof job.skills === 'string'
      ? JSON.parse(job.skills)
      : job.skills || [];

    // 1. Skills Match (40%)
    const skillsScore = this.calculateSkillsMatch(professionalSkills, jobSkills);

    // 2. Experience Score (20%)
    const experienceScore = this.calculateExperienceScore(
      professionalSkills,
      job.experience_years || 0
    );

    // 3. HUBZone Score (30%)
    const hubzoneScore = this.calculateHubzoneScore(
      professional.verification_status === 'verified',
      job.hubzone_resident_required
    );

    // 4. Location Score (10%)
    const professionalAddress = typeof professional.current_address === 'string'
      ? JSON.parse(professional.current_address)
      : professional.current_address;

    const jobLocation = typeof job.location === 'string'
      ? JSON.parse(job.location)
      : job.location;

    const locationScore = await this.calculateLocationScore(
      professionalAddress,
      jobLocation,
      job.is_remote
    );

    // Calculate total weighted score
    const total = Math.round(
      skillsScore.score * MATCH_WEIGHTS.skills +
      experienceScore.score * MATCH_WEIGHTS.experience +
      hubzoneScore.score * MATCH_WEIGHTS.hubzone +
      locationScore.score * MATCH_WEIGHTS.location
    );

    return {
      total,
      skills: { ...skillsScore, weight: MATCH_WEIGHTS.skills * 100 },
      experience: { ...experienceScore, weight: MATCH_WEIGHTS.experience * 100 },
      hubzone: { ...hubzoneScore, weight: MATCH_WEIGHTS.hubzone * 100 },
      location: { ...locationScore, weight: MATCH_WEIGHTS.location * 100 },
    };
  }

  private calculateSkillsMatch(
    professionalSkills: { name: string }[],
    jobSkills: RequiredSkill[]
  ): { score: number; matchedSkills: string[]; missingSkills: string[] } {
    if (jobSkills.length === 0) {
      return { score: 100, matchedSkills: [], missingSkills: [] };
    }

    const professionalSkillNames = professionalSkills.map((s) => s.name.toLowerCase());
    const requiredSkills = jobSkills.filter((s) => s.required);
    const preferredSkills = jobSkills.filter((s) => !s.required);

    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    // Required skills are worth 70% of skills score
    let requiredScore = 0;
    requiredSkills.forEach((skill) => {
      if (professionalSkillNames.includes(skill.name.toLowerCase())) {
        matchedSkills.push(skill.name);
        requiredScore += 1;
      } else {
        missingSkills.push(skill.name);
      }
    });
    const requiredPercentage = requiredSkills.length > 0
      ? (requiredScore / requiredSkills.length) * 70
      : 70;

    // Preferred skills are worth 30% of skills score
    let preferredScore = 0;
    preferredSkills.forEach((skill) => {
      if (professionalSkillNames.includes(skill.name.toLowerCase())) {
        matchedSkills.push(skill.name);
        preferredScore += 1;
      }
    });
    const preferredPercentage = preferredSkills.length > 0
      ? (preferredScore / preferredSkills.length) * 30
      : 30;

    return {
      score: Math.round(requiredPercentage + preferredPercentage),
      matchedSkills,
      missingSkills,
    };
  }

  private calculateExperienceScore(
    professionalSkills: { yearsOfExperience?: number }[],
    requiredYears: number
  ): { score: number; yearsRequired: number; yearsHave: number } {
    // Calculate average years of experience from skills
    const yearsOfExperience = professionalSkills
      .filter((s) => s.yearsOfExperience !== undefined)
      .map((s) => s.yearsOfExperience as number);

    const avgYears = yearsOfExperience.length > 0
      ? yearsOfExperience.reduce((a, b) => a + b, 0) / yearsOfExperience.length
      : 0;

    if (requiredYears === 0) {
      return { score: 100, yearsRequired: 0, yearsHave: Math.round(avgYears) };
    }

    // Score based on how close they are to required years
    const ratio = avgYears / requiredYears;
    let score: number;

    if (ratio >= 1) {
      score = 100; // Meets or exceeds requirement
    } else if (ratio >= 0.75) {
      score = 85; // Close to requirement
    } else if (ratio >= 0.5) {
      score = 70; // Halfway there
    } else if (ratio >= 0.25) {
      score = 50; // Some experience
    } else {
      score = 30; // Minimal experience
    }

    return {
      score,
      yearsRequired: requiredYears,
      yearsHave: Math.round(avgYears),
    };
  }

  private calculateHubzoneScore(
    isHubzoneResident: boolean,
    hubzoneRequired: boolean
  ): { score: number; isRequired: boolean; isResident: boolean } {
    if (hubzoneRequired) {
      return {
        score: isHubzoneResident ? 100 : 0, // Critical requirement
        isRequired: true,
        isResident: isHubzoneResident,
      };
    }

    // If not required, HUBZone residents get a bonus
    return {
      score: isHubzoneResident ? 100 : 70,
      isRequired: false,
      isResident: isHubzoneResident,
    };
  }

  private async calculateLocationScore(
    professionalAddress: Address,
    jobLocation: Address,
    isRemote: boolean
  ): Promise<{ score: number; distanceMiles: number; isRemote: boolean }> {
    if (isRemote) {
      return { score: 100, distanceMiles: 0, isRemote: true };
    }

    // Calculate distance (simplified - in production use a proper geocoding service)
    const distanceMiles = this.calculateDistanceMiles(professionalAddress, jobLocation);

    let score: number;
    if (distanceMiles <= 10) {
      score = 100;
    } else if (distanceMiles <= 25) {
      score = 90;
    } else if (distanceMiles <= 50) {
      score = 75;
    } else if (distanceMiles <= 100) {
      score = 50;
    } else {
      score = 25;
    }

    return { score, distanceMiles, isRemote: false };
  }

  private calculateDistanceMiles(addr1: Address, addr2: Address): number {
    // Simplified distance calculation based on same city/state
    if (addr1.city?.toLowerCase() === addr2.city?.toLowerCase() &&
      addr1.state?.toLowerCase() === addr2.state?.toLowerCase()) {
      return 5; // Same city
    }

    if (addr1.state?.toLowerCase() === addr2.state?.toLowerCase()) {
      return 50; // Same state
    }

    // Different state - assume far
    return 200;
  }

  // ============ ANALYTICS ============

  private async recordJobView(jobId: string): Promise<void> {
    await db.query(
      `INSERT INTO job_analytics (job_id, event_type, created_at)
       VALUES ($1, 'view', NOW())`,
      [jobId]
    );
  }

  private async recordApplication(jobId: string, professionalId: string): Promise<void> {
    await db.query(
      `INSERT INTO job_analytics (job_id, professional_id, event_type, created_at)
       VALUES ($1, $2, 'application', NOW())`,
      [jobId, professionalId]
    );
  }

  private async recordHire(jobId: string, professionalId: string): Promise<void> {
    await db.query(
      `INSERT INTO job_analytics (job_id, professional_id, event_type, created_at)
       VALUES ($1, $2, 'hire', NOW())`,
      [jobId, professionalId]
    );
  }

  /**
   * Get analytics for a job posting
   */
  async getJobAnalytics(jobId: string): Promise<Analytics> {
    // Get counts
    const countsResult = await db.query(
      `SELECT 
        COUNT(*) FILTER (WHERE event_type = 'view') as views,
        COUNT(*) FILTER (WHERE event_type = 'application') as applications,
        COUNT(*) FILTER (WHERE event_type = 'hire') as hires
       FROM job_analytics WHERE job_id = $1`,
      [jobId]
    );

    // Get average match score
    const matchScoreResult = await db.query(
      'SELECT AVG(match_score) as avg_score FROM applications WHERE job_id = $1',
      [jobId]
    );

    // Get views per day (last 30 days)
    const viewsPerDayResult = await db.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM job_analytics 
       WHERE job_id = $1 AND event_type = 'view' AND created_at > NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [jobId]
    );

    // Get applications per day (last 30 days)
    const appsPerDayResult = await db.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM job_analytics 
       WHERE job_id = $1 AND event_type = 'application' AND created_at > NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [jobId]
    );

    const counts = countsResult.rows[0];
    const views = parseInt(counts.views, 10);
    const applications = parseInt(counts.applications, 10);
    const hires = parseInt(counts.hires, 10);

    return {
      jobId,
      views,
      applications,
      hires,
      avgMatchScore: Math.round(parseFloat(matchScoreResult.rows[0]?.avg_score || '0')),
      conversionRate: views > 0 ? Math.round((applications / views) * 100) : 0,
      viewsPerDay: viewsPerDayResult.rows.map((r: any) => ({
        date: r.date,
        count: parseInt(r.count, 10),
      })),
      applicationsPerDay: appsPerDayResult.rows.map((r: any) => ({
        date: r.date,
        count: parseInt(r.count, 10),
      })),
    };
  }

  // ============ NOTIFICATIONS (STUBS) ============

  private async notifyNewApplication(jobId: string, professionalId: string): Promise<void> {
    // Would integrate with notification service
    console.info(`New application for job ${jobId} from professional ${professionalId}`);
  }

  private async notifyStatusChange(
    professionalId: string,
    jobId: string,
    status: ApplicationStatus
  ): Promise<void> {
    // Would integrate with notification service
    console.info(`Application status changed to ${status} for professional ${professionalId} on job ${jobId}`);
  }

  // ============ HELPER METHODS ============

  private mapRowToJob(row: Record<string, unknown>): Job {
    return {
      id: row.id as string,
      businessId: row.business_id as string,
      businessName: row.business_name as string,
      businessLogo: row.business_logo as string | undefined,
      title: row.title as string,
      description: row.description as string,
      responsibilities: row.responsibilities as string | undefined,
      qualifications: row.qualifications as string | undefined,
      benefits: row.benefits as string | undefined,
      hubzoneResidentRequired: row.hubzone_resident_required as boolean,
      skills: typeof row.skills === 'string' ? JSON.parse(row.skills as string) : row.skills || [],
      experienceYears: row.experience_years as number | undefined,
      educationRequired: row.education_required as string | undefined,
      salaryRange: typeof row.salary_range === 'string'
        ? JSON.parse(row.salary_range as string)
        : row.salary_range,
      employmentType: row.employment_type as EmploymentType,
      location: typeof row.location === 'string'
        ? JSON.parse(row.location as string)
        : row.location,
      isRemote: row.is_remote as boolean,
      remotePolicy: row.remote_policy as 'fully_remote' | 'hybrid' | 'on_site' | undefined,
      status: row.status as JobStatus,
      applicationCount: row.application_count as number || 0,
      viewCount: row.view_count as number || 0,
      postedAt: row.posted_at as string,
      expiresAt: row.expires_at as string | undefined,
      updatedAt: row.updated_at as string,
      createdAt: row.created_at as string,
    };
  }

  private mapRowToApplication(row: Record<string, unknown>): Application {
    return {
      id: row.id as string,
      jobId: row.job_id as string,
      professionalId: row.professional_id as string,
      applicantName: row.applicant_name as string,
      applicantEmail: row.applicant_email as string,
      applicantPhone: row.applicant_phone as string | undefined,
      coverLetter: row.cover_letter as string | undefined,
      resumeUrl: row.resume_url as string | undefined,
      portfolioUrl: row.portfolio_url as string | undefined,
      status: row.status as ApplicationStatus,
      statusHistory: typeof row.status_history === 'string'
        ? JSON.parse(row.status_history as string)
        : row.status_history || [],
      matchScore: row.match_score as number || 0,
      skillsMatchScore: row.skills_match_score as number || 0,
      experienceScore: row.experience_score as number || 0,
      hubzoneScore: row.hubzone_score as number || 0,
      locationScore: row.location_score as number || 0,
      appliedAt: row.applied_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}

export const jobService = new JobService();

