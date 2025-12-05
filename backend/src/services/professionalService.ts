import { db } from './database.js';
import { HubzoneService } from './hubzoneService.js';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';

interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface Skill {
  id: string;
  name: string;
  category: string;
  yearsOfExperience?: number;
}

interface Certification {
  id: string;
  name: string;
  issuingOrganization: string;
  issueDate: string;
  expirationDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

interface Professional {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  currentAddress: Address;
  verificationStatus: 'verified' | 'pending' | 'expired' | 'unverified';
  hubzoneType?: string;
  lastVerifiedAt?: string;
  nextVerificationDue?: string;
  headline?: string;
  summary?: string;
  linkedinUrl?: string;
  resumeUrl?: string;
  skills: Skill[];
  certifications: Certification[];
  verificationCertificate?: VerificationCertificate;
  isPublic: boolean;
  profileViewCount: number;
  createdAt: string;
  updatedAt: string;
}

interface VerificationCertificate {
  id: string;
  professionalId: string;
  certificateNumber: string;
  verificationDate: string;
  expirationDate: string;
  address: Address;
  hubzoneType: string;
  qrCodeData: string;
  isValid: boolean;
  pdfUrl?: string;
}

interface ProfessionalUpdateData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  headline?: string;
  summary?: string;
  linkedinUrl?: string;
  currentAddress?: Address;
  skills?: Skill[];
  certifications?: Certification[];
  isPublic?: boolean;
}

interface ProfessionalFilters {
  verificationStatus?: string;
  skills?: string[];
  state?: string;
  city?: string;
  zipCode?: string;
  radius?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
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

interface ResidencyVerificationResult {
  isInHubzone: boolean;
  hubzoneType?: string;
  verificationDate: string;
  expirationDate: string;
  certificateId?: string;
  address: Address;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

const VERIFICATION_VALIDITY_DAYS = 90;
const PLATFORM_BASE_URL = process.env.PLATFORM_URL || 'https://hz-navigator.sba.gov';

export class ProfessionalService {
  private hubzoneService: HubzoneService;

  constructor() {
    this.hubzoneService = new HubzoneService();
  }

  /**
   * Get professional profile by user ID
   */
  async getProfileByUserId(userId: string): Promise<Professional | null> {
    const query = `
      SELECT 
        p.*,
        vc.id as cert_id,
        vc.certificate_number,
        vc.verification_date as cert_verification_date,
        vc.expiration_date as cert_expiration_date,
        vc.address as cert_address,
        vc.hubzone_type as cert_hubzone_type,
        vc.qr_code_data,
        vc.is_valid as cert_is_valid,
        vc.pdf_url as cert_pdf_url
      FROM professionals p
      LEFT JOIN verification_certificates vc ON vc.professional_id = p.id AND vc.is_valid = true
      WHERE p.user_id = $1
    `;

    const result = await db.query(query, [userId]);
    if (result.rows.length === 0) return null;

    return this.mapRowToProfessional(result.rows[0]);
  }

  /**
   * Get professional profile by ID (public view)
   */
  async getProfileById(id: string): Promise<Professional | null> {
    const query = `
      SELECT 
        p.*,
        vc.id as cert_id,
        vc.certificate_number,
        vc.verification_date as cert_verification_date,
        vc.expiration_date as cert_expiration_date,
        vc.address as cert_address,
        vc.hubzone_type as cert_hubzone_type,
        vc.qr_code_data,
        vc.is_valid as cert_is_valid
      FROM professionals p
      LEFT JOIN verification_certificates vc ON vc.professional_id = p.id AND vc.is_valid = true
      WHERE p.id = $1 AND p.is_public = true
    `;

    const result = await db.query(query, [id]);
    if (result.rows.length === 0) return null;

    // Increment view count
    await db.query(
      'UPDATE professionals SET profile_view_count = profile_view_count + 1 WHERE id = $1',
      [id]
    );

    return this.mapRowToProfessional(result.rows[0]);
  }

  /**
   * Update professional profile
   */
  async updateProfile(
    professionalId: string,
    data: ProfessionalUpdateData
  ): Promise<Professional | null> {
    const updateFields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.firstName !== undefined) {
      updateFields.push(`first_name = $${paramIndex++}`);
      values.push(data.firstName);
    }
    if (data.lastName !== undefined) {
      updateFields.push(`last_name = $${paramIndex++}`);
      values.push(data.lastName);
    }
    if (data.email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }
    if (data.phone !== undefined) {
      updateFields.push(`phone = $${paramIndex++}`);
      values.push(data.phone);
    }
    if (data.headline !== undefined) {
      updateFields.push(`headline = $${paramIndex++}`);
      values.push(data.headline);
    }
    if (data.summary !== undefined) {
      updateFields.push(`summary = $${paramIndex++}`);
      values.push(data.summary);
    }
    if (data.linkedinUrl !== undefined) {
      updateFields.push(`linkedin_url = $${paramIndex++}`);
      values.push(data.linkedinUrl);
    }
    if (data.currentAddress !== undefined) {
      updateFields.push(`current_address = $${paramIndex++}`);
      values.push(JSON.stringify(data.currentAddress));
    }
    if (data.skills !== undefined) {
      updateFields.push(`skills = $${paramIndex++}`);
      values.push(JSON.stringify(data.skills));
    }
    if (data.certifications !== undefined) {
      updateFields.push(`certifications = $${paramIndex++}`);
      values.push(JSON.stringify(data.certifications));
    }
    if (data.isPublic !== undefined) {
      updateFields.push(`is_public = $${paramIndex++}`);
      values.push(data.isPublic);
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(professionalId);

    const query = `
      UPDATE professionals 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);
    if (result.rows.length === 0) return null;

    return this.getProfileByUserId(result.rows[0].user_id);
  }

  /**
   * Verify residency in HUBZone
   */
  async verifyResidency(professionalId: string): Promise<ResidencyVerificationResult> {
    // Get professional's current address
    const professionalResult = await db.query(
      'SELECT * FROM professionals WHERE id = $1',
      [professionalId]
    );

    if (professionalResult.rows.length === 0) {
      throw new Error('Professional not found');
    }

    const professional = professionalResult.rows[0];
    const address: Address = typeof professional.current_address === 'string'
      ? JSON.parse(professional.current_address)
      : professional.current_address;

    // Geocode the address to get coordinates
    const coordinates = await this.geocodeAddress(address);

    // Check if coordinates are within a HUBZone
    const hubzoneCheck = await this.hubzoneService.checkLocation(
      coordinates.latitude,
      coordinates.longitude
    );

    const verificationDate = new Date();
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + VERIFICATION_VALIDITY_DAYS);

    if (hubzoneCheck.isInHubzone && hubzoneCheck.matchingZones.length > 0) {
      const hubzoneType = hubzoneCheck.matchingZones[0].zone_type || 'Qualified Census Tract';

      // Invalidate old certificates
      await db.query(
        'UPDATE verification_certificates SET is_valid = false WHERE professional_id = $1',
        [professionalId]
      );

      // Generate certificate number
      const certificateNumber = this.generateCertificateNumber();

      // Generate QR code
      const verificationUrl = `${PLATFORM_BASE_URL}/verify/${certificateNumber}`;
      const qrCodeData = await QRCode.toDataURL(verificationUrl, {
        width: 200,
        margin: 1,
        color: {
          dark: '#0E4F8B',
          light: '#FFFFFF',
        },
      });

      // Create new certificate
      const certResult = await db.query(
        `INSERT INTO verification_certificates 
         (professional_id, certificate_number, verification_date, expiration_date, address, hubzone_type, qr_code_data, is_valid)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)
         RETURNING id`,
        [
          professionalId,
          certificateNumber,
          verificationDate.toISOString(),
          expirationDate.toISOString(),
          JSON.stringify(address),
          hubzoneType,
          qrCodeData,
        ]
      );

      // Update professional status
      await db.query(
        `UPDATE professionals 
         SET verification_status = 'verified',
             hubzone_type = $1,
             last_verified_at = $2,
             next_verification_due = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [hubzoneType, verificationDate.toISOString(), expirationDate.toISOString(), professionalId]
      );

      return {
        isInHubzone: true,
        hubzoneType,
        verificationDate: verificationDate.toISOString(),
        expirationDate: expirationDate.toISOString(),
        certificateId: certResult.rows[0].id,
        address,
        coordinates,
      };
    } else {
      // Update professional status to unverified
      await db.query(
        `UPDATE professionals 
         SET verification_status = 'unverified',
             hubzone_type = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [professionalId]
      );

      return {
        isInHubzone: false,
        verificationDate: verificationDate.toISOString(),
        expirationDate: expirationDate.toISOString(),
        address,
        coordinates,
      };
    }
  }

  /**
   * Generate verification certificate PDF
   */
  async generateVerificationCertificate(professionalId: string): Promise<Buffer> {
    // Get professional and certificate data
    const query = `
      SELECT 
        p.first_name, p.last_name, p.email,
        vc.*
      FROM professionals p
      JOIN verification_certificates vc ON vc.professional_id = p.id
      WHERE p.id = $1 AND vc.is_valid = true
      ORDER BY vc.created_at DESC
      LIMIT 1
    `;

    const result = await db.query(query, [professionalId]);
    if (result.rows.length === 0) {
      throw new Error('No valid verification certificate found');
    }

    const data = result.rows[0];
    const address: Address = typeof data.address === 'string'
      ? JSON.parse(data.address)
      : data.address;

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        size: 'LETTER',
        margin: 50,
        info: {
          Title: 'HUBZone Residency Verification Certificate',
          Author: 'HZ Navigator',
          Subject: 'HUBZone Residency Verification',
        },
      });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header with gradient effect
      doc.rect(0, 0, 612, 120).fill('#0E4F8B');
      doc.rect(0, 110, 612, 10).fill('#0073C7');

      // Logo placeholder and title
      doc.fillColor('#FFFFFF')
        .fontSize(28)
        .font('Helvetica-Bold')
        .text('HZ Navigator', 50, 40, { align: 'center' });

      doc.fontSize(14)
        .font('Helvetica')
        .text('HUBZone Residency Verification Certificate', 50, 75, { align: 'center' });

      // Certificate body
      doc.fillColor('#1F2937');

      // Certificate number and validity badge
      doc.moveDown(4);
      doc.fontSize(12)
        .fillColor('#6B7280')
        .text(`Certificate Number: ${data.certificate_number}`, { align: 'center' });

      // Main certificate content
      doc.moveDown(2);
      doc.fontSize(16)
        .fillColor('#1F2937')
        .font('Helvetica-Bold')
        .text('This certifies that', { align: 'center' });

      doc.moveDown(0.5);
      doc.fontSize(24)
        .fillColor('#0E4F8B')
        .text(`${data.first_name} ${data.last_name}`, { align: 'center' });

      doc.moveDown(0.5);
      doc.fontSize(14)
        .fillColor('#1F2937')
        .font('Helvetica')
        .text('resides at a HUBZone qualified address:', { align: 'center' });

      // Address box
      doc.moveDown(1);
      const addressY = doc.y;
      doc.rect(100, addressY, 412, 80)
        .fillAndStroke('#F3F4F6', '#E5E7EB');

      doc.fillColor('#1F2937')
        .fontSize(12)
        .text(address.street1, 120, addressY + 15);

      if (address.street2) {
        doc.text(address.street2, 120, doc.y);
      }

      doc.text(`${address.city}, ${address.state} ${address.zipCode}`, 120, doc.y + 5);

      // HUBZone type badge
      doc.moveDown(3);
      const badgeY = doc.y;
      doc.rect(180, badgeY, 252, 30)
        .fill('#DEF7EC');

      doc.fillColor('#065F46')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(`HUBZone Type: ${data.hubzone_type}`, 180, badgeY + 10, {
          width: 252,
          align: 'center'
        });

      // Dates
      doc.moveDown(2);
      doc.fillColor('#6B7280')
        .font('Helvetica')
        .fontSize(11);

      const verificationDate = new Date(data.verification_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const expirationDate = new Date(data.expiration_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      doc.text(`Verification Date: ${verificationDate}`, { align: 'center' });
      doc.text(`Valid Until: ${expirationDate}`, { align: 'center' });

      // QR Code
      doc.moveDown(2);
      if (data.qr_code_data) {
        const qrCodeBuffer = Buffer.from(data.qr_code_data.split(',')[1], 'base64');
        doc.image(qrCodeBuffer, 256, doc.y, { width: 100 });
      }

      doc.moveDown(6);
      doc.fontSize(9)
        .fillColor('#9CA3AF')
        .text('Scan QR code to verify certificate authenticity', { align: 'center' });

      // Footer
      const footerY = 700;
      doc.rect(0, footerY, 612, 92).fill('#F9FAFB');

      doc.fillColor('#6B7280')
        .fontSize(10)
        .font('Helvetica')
        .text(
          'This certificate is digitally signed by HZ Navigator and is valid for 90 days from the verification date.',
          50,
          footerY + 15,
          { align: 'center', width: 512 }
        );

      doc.text(
        'To verify this certificate, visit hz-navigator.sba.gov/verify or scan the QR code above.',
        50,
        footerY + 40,
        { align: 'center', width: 512 }
      );

      doc.fontSize(9)
        .fillColor('#9CA3AF')
        .text(
          `Generated on ${new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}`,
          50,
          footerY + 65,
          { align: 'center', width: 512 }
        );

      doc.end();
    });
  }

  /**
   * Get professionals list (for businesses)
   */
  async getProfessionals(filters: ProfessionalFilters): Promise<PaginatedResult<Professional>> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const whereConditions = ['p.is_public = true'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.verificationStatus) {
      whereConditions.push(`p.verification_status = $${paramIndex++}`);
      params.push(filters.verificationStatus);
    }

    if (filters.state) {
      whereConditions.push(`p.current_address->>'state' = $${paramIndex++}`);
      params.push(filters.state);
    }

    if (filters.city) {
      whereConditions.push(`p.current_address->>'city' ILIKE $${paramIndex++}`);
      params.push(`%${filters.city}%`);
    }

    if (filters.search) {
      whereConditions.push(`(
        p.first_name ILIKE $${paramIndex} OR 
        p.last_name ILIKE $${paramIndex} OR 
        p.headline ILIKE $${paramIndex} OR
        p.summary ILIKE $${paramIndex}
      )`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.skills && filters.skills.length > 0) {
      whereConditions.push(`EXISTS (
        SELECT 1 FROM jsonb_array_elements(p.skills) AS skill
        WHERE skill->>'name' = ANY($${paramIndex++}::text[])
      )`);
      params.push(filters.skills);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    let orderBy = 'p.updated_at DESC';
    if (filters.sortBy === 'name') {
      orderBy = `p.last_name ${filters.sortOrder === 'desc' ? 'DESC' : 'ASC'}, p.first_name ${filters.sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
    } else if (filters.sortBy === 'verificationDate') {
      orderBy = `p.last_verified_at ${filters.sortOrder === 'desc' ? 'DESC NULLS LAST' : 'ASC NULLS LAST'}`;
    }

    // Count query
    const countQuery = `SELECT COUNT(*) FROM professionals p ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Data query
    params.push(limit, offset);
    const dataQuery = `
      SELECT p.* 
      FROM professionals p
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    const dataResult = await db.query(dataQuery, params);

    return {
      data: dataResult.rows.map((row: Record<string, unknown>) => this.mapRowToProfessional(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Verify a certificate by its number
   */
  async verifyCertificate(certificateNumber: string): Promise<{
    valid: boolean;
    certificate?: VerificationCertificate;
    professional?: { firstName: string; lastName: string };
  }> {
    const query = `
      SELECT 
        vc.*,
        p.first_name,
        p.last_name
      FROM verification_certificates vc
      JOIN professionals p ON p.id = vc.professional_id
      WHERE vc.certificate_number = $1
    `;

    const result = await db.query(query, [certificateNumber]);

    if (result.rows.length === 0) {
      return { valid: false };
    }

    const row = result.rows[0];
    if (!row) {
      return { valid: false };
    }
    const isExpired = new Date(row.expiration_date) < new Date();

    return {
      valid: row.is_valid && !isExpired,
      certificate: {
        id: row.id,
        professionalId: row.professional_id,
        certificateNumber: row.certificate_number,
        verificationDate: row.verification_date,
        expirationDate: row.expiration_date,
        address: typeof row.address === 'string' ? JSON.parse(row.address) : row.address,
        hubzoneType: row.hubzone_type,
        qrCodeData: row.qr_code_data,
        isValid: row.is_valid && !isExpired,
      },
      professional: {
        firstName: row.first_name as string,
        lastName: row.last_name as string,
      },
    };
  }

  // Helper methods

  private async geocodeAddress(address: Address): Promise<{ latitude: number; longitude: number }> {
    // In production, use a real geocoding service (Google Maps, Census Bureau, etc.)
    // For now, return mock coordinates based on ZIP code prefix
    const zipPrefix = address.zipCode.substring(0, 3);

    // Mock coordinates for DC area (20xxx ZIP codes)
    if (zipPrefix.startsWith('20')) {
      return { latitude: 38.9072, longitude: -77.0369 };
    }

    // Default coordinates (center of US)
    return { latitude: 39.8283, longitude: -98.5795 };
  }

  private generateCertificateNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `HZ-${timestamp}-${random}`;
  }

  private mapRowToProfessional(row: Record<string, unknown>): Professional {
    const currentAddress = typeof row.current_address === 'string'
      ? JSON.parse(row.current_address as string)
      : row.current_address;

    const skills = typeof row.skills === 'string'
      ? JSON.parse(row.skills as string)
      : row.skills || [];

    const certifications = typeof row.certifications === 'string'
      ? JSON.parse(row.certifications as string)
      : row.certifications || [];

    let verificationCertificate: VerificationCertificate | undefined;
    if (row.cert_id) {
      const certAddress = typeof row.cert_address === 'string'
        ? JSON.parse(row.cert_address as string)
        : row.cert_address;

      verificationCertificate = {
        id: row.cert_id as string,
        professionalId: row.id as string,
        certificateNumber: row.certificate_number as string,
        verificationDate: row.cert_verification_date as string,
        expirationDate: row.cert_expiration_date as string,
        address: certAddress,
        hubzoneType: row.cert_hubzone_type as string,
        qrCodeData: row.qr_code_data as string,
        isValid: row.cert_is_valid as boolean,
        pdfUrl: row.cert_pdf_url as string | undefined,
      };
    }

    return {
      id: row.id as string,
      userId: row.user_id as string,
      firstName: row.first_name as string,
      lastName: row.last_name as string,
      email: row.email as string,
      phone: row.phone as string | undefined,
      currentAddress,
      verificationStatus: row.verification_status as Professional['verificationStatus'],
      hubzoneType: row.hubzone_type as string | undefined,
      lastVerifiedAt: row.last_verified_at as string | undefined,
      nextVerificationDue: row.next_verification_due as string | undefined,
      headline: row.headline as string | undefined,
      summary: row.summary as string | undefined,
      linkedinUrl: row.linkedin_url as string | undefined,
      resumeUrl: row.resume_url as string | undefined,
      skills,
      certifications,
      verificationCertificate,
      isPublic: row.is_public as boolean,
      profileViewCount: row.profile_view_count as number || 0,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}

export const professionalService = new ProfessionalService();

