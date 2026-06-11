import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

// Configure route caching - user-specific dynamic data (changes infrequently)
export const dynamic = 'force-dynamic';
export const revalidate = 600; // Revalidate every 10 minutes (salary changes rarely)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Fetch salary structures from database using type assertion
    const salaryStructures = await (prisma as any).salaryStructure.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(salaryStructures);
  } catch (error) {
    console.error('❌ SALARY STRUCTURE GET - Error:', error);
    console.error('❌ SALARY STRUCTURE GET - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to fetch salary structures' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      jobTitle,
      company,
      baseSalary,
      allowances,
      deductions,
      employerContributions,
      effectiveDate,
      endDate,
      currency,
      location,
      department,
      grade,
      notes,
      userId,
      changeType,
      changeReason
    } = body;

    // Validate required fields
    if (!jobTitle || !company || !baseSalary || !effectiveDate || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }


    // First, deactivate all existing salary structures for this user
    await (prisma as any).salaryStructure.updateMany({
      where: { userId: userId, isActive: true },
      data: { isActive: false }
    });

    // Create new salary structure in database using type assertion
    const newSalaryStructure = await (prisma as any).salaryStructure.create({
      data: {
        jobTitle,
        company,
        baseSalary: parseFloat(baseSalary),
        allowances: allowances ? JSON.stringify(allowances) : null,
        deductions: deductions ? JSON.stringify(deductions) : null,
        employerContributions: employerContributions ? JSON.stringify(employerContributions) : null,
        effectiveDate: new Date(effectiveDate),
        endDate: endDate ? new Date(endDate) : null,
        currency: currency || 'INR',
        location: location || null,
        department: department || null,
        grade: grade || null,
        notes: notes || null,
        userId: userId,
        isActive: true
      }
    });


    // Always create salary history entry for timeline tracking
    await (prisma as any).salaryHistory.create({
      data: {
        salaryStructureId: newSalaryStructure.id,
        jobTitle: newSalaryStructure.jobTitle,
        company: newSalaryStructure.company,
        baseSalary: newSalaryStructure.baseSalary,
        allowances: newSalaryStructure.allowances,
        deductions: newSalaryStructure.deductions,
        employerContributions: newSalaryStructure.employerContributions,
        effectiveDate: newSalaryStructure.effectiveDate,
        endDate: newSalaryStructure.endDate,
        currency: newSalaryStructure.currency,
        location: newSalaryStructure.location,
        department: newSalaryStructure.department,
        grade: newSalaryStructure.grade,
        changeType: changeType || 'NEW_JOB',
        changeReason: changeReason || 'Initial setup',
        userId: userId
      }
    });

    return NextResponse.json(newSalaryStructure);
  } catch (error) {
    console.error('❌ SALARY STRUCTURE POST - Error:', error);
    console.error('❌ SALARY STRUCTURE POST - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to create salary structure' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    // Extract changeType and changeReason separately - they go to SalaryHistory, not SalaryStructure
    const { id, changeType, changeReason, userId, historyId, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Update salary structure in database using type assertion
    const updatedSalaryStructure = await (prisma as any).salaryStructure.update({
      where: { id },
      data: {
        jobTitle: updateData.jobTitle,
        company: updateData.company,
        baseSalary: updateData.baseSalary ? parseFloat(updateData.baseSalary) : undefined,
        allowances: updateData.allowances ? JSON.stringify(updateData.allowances) : undefined,
        deductions: updateData.deductions ? JSON.stringify(updateData.deductions) : undefined,
        employerContributions: updateData.employerContributions ? JSON.stringify(updateData.employerContributions) : undefined,
        effectiveDate: updateData.effectiveDate ? new Date(updateData.effectiveDate) : undefined,
        endDate: updateData.endDate ? new Date(updateData.endDate) : undefined,
        currency: updateData.currency,
        location: updateData.location || null,
        department: updateData.department || null,
        grade: updateData.grade || null,
        notes: updateData.notes || null,
        updatedAt: new Date()
      }
    });


    // Update salary history — specific revision when historyId is provided, else latest for structure
    if (userId) {
      const historyData = {
        jobTitle: updatedSalaryStructure.jobTitle,
        company: updatedSalaryStructure.company,
        baseSalary: updatedSalaryStructure.baseSalary,
        allowances: updatedSalaryStructure.allowances,
        deductions: updatedSalaryStructure.deductions,
        employerContributions: updatedSalaryStructure.employerContributions,
        effectiveDate: updatedSalaryStructure.effectiveDate,
        endDate: updatedSalaryStructure.endDate,
        currency: updatedSalaryStructure.currency,
        location: updatedSalaryStructure.location,
        department: updatedSalaryStructure.department,
        grade: updatedSalaryStructure.grade,
      };

      if (historyId) {
        const existingHistory = await (prisma as any).salaryHistory.findFirst({
          where: { id: historyId, salaryStructureId: id, userId },
        });

        if (existingHistory) {
          await (prisma as any).salaryHistory.update({
            where: { id: historyId },
            data: {
              ...historyData,
              changeType: changeType || existingHistory.changeType,
              changeReason: changeReason || existingHistory.changeReason,
            },
          });
        }
      } else {
        const existingHistory = await (prisma as any).salaryHistory.findFirst({
          where: { salaryStructureId: id },
          orderBy: { createdAt: 'desc' },
        });

        if (existingHistory) {
          await (prisma as any).salaryHistory.update({
            where: { id: existingHistory.id },
            data: {
              ...historyData,
              changeType: changeType || existingHistory.changeType,
              changeReason: changeReason || existingHistory.changeReason,
            },
          });
        }
      }
    }

    return NextResponse.json(updatedSalaryStructure);
  } catch (error) {
    console.error('❌ SALARY STRUCTURE PUT - Error:', error);
    console.error('❌ SALARY STRUCTURE PUT - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to update salary structure' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Delete from database using type assertion
    await (prisma as any).salaryStructure.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Salary structure deleted successfully' });
  } catch (error) {
    console.error('❌ SALARY STRUCTURE DELETE - Error:', error);
    console.error('❌ SALARY STRUCTURE DELETE - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to delete salary structure' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, userId } = body;

    if (!id || !userId || action !== 'ACTIVATE') {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
    }

    // 1. Deactivate all structures for this user
    await (prisma as any).salaryStructure.updateMany({
      where: { userId },
      data: { isActive: false }
    });

    // 2. Activate the requested structure
    const updatedStructure = await (prisma as any).salaryStructure.update({
      where: { id },
      data: { isActive: true }
    });

    return NextResponse.json(updatedStructure);
  } catch (error) {
    console.error('❌ SALARY STRUCTURE PATCH - Error:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
