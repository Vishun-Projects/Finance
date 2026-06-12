import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth } from '@/lib/api-auth';
import { rejectForeignUserId } from '@/lib/api-user-scope';

export const dynamic = 'force-dynamic';
export const revalidate = 600;

export const GET = withAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const forbidden = rejectForeignUserId(user, searchParams.get('userId'));
    if (forbidden) return forbidden;

    const salaryStructures = await (prisma as any).salaryStructure.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(salaryStructures);
  } catch (error) {
    console.error('SALARY STRUCTURE GET - Error:', error);
    return NextResponse.json({ error: 'Failed to fetch salary structures' }, { status: 500 });
  }
});

export const POST = withAuth(async (request, user) => {
  try {
    const body = await request.json();
    const forbidden = rejectForeignUserId(user, body.userId);
    if (forbidden) return forbidden;

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
      changeType,
      changeReason,
    } = body;

    if (!jobTitle || !company || !baseSalary || !effectiveDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await (prisma as any).salaryStructure.updateMany({
      where: { userId: user.id, isActive: true },
      data: { isActive: false },
    });

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
        userId: user.id,
        isActive: true,
      },
    });

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
        userId: user.id,
      },
    });

    return NextResponse.json(newSalaryStructure);
  } catch (error) {
    console.error('SALARY STRUCTURE POST - Error:', error);
    return NextResponse.json({ error: 'Failed to create salary structure' }, { status: 500 });
  }
});

export const PUT = withAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { id, changeType, changeReason, historyId, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const owned = await (prisma as any).salaryStructure.findFirst({
      where: { id, userId: user.id },
    });
    if (!owned) {
      return NextResponse.json({ error: 'Salary structure not found' }, { status: 404 });
    }

    const updatedSalaryStructure = await (prisma as any).salaryStructure.update({
      where: { id },
      data: {
        jobTitle: updateData.jobTitle,
        company: updateData.company,
        baseSalary: updateData.baseSalary ? parseFloat(updateData.baseSalary) : undefined,
        allowances: updateData.allowances ? JSON.stringify(updateData.allowances) : undefined,
        deductions: updateData.deductions ? JSON.stringify(updateData.deductions) : undefined,
        employerContributions: updateData.employerContributions
          ? JSON.stringify(updateData.employerContributions)
          : undefined,
        effectiveDate: updateData.effectiveDate ? new Date(updateData.effectiveDate) : undefined,
        endDate: updateData.endDate ? new Date(updateData.endDate) : undefined,
        currency: updateData.currency,
        location: updateData.location ?? undefined,
        department: updateData.department ?? undefined,
        grade: updateData.grade ?? undefined,
        notes: updateData.notes ?? undefined,
        updatedAt: new Date(),
      },
    });

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
        where: { id: historyId, salaryStructureId: id, userId: user.id },
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
        where: { salaryStructureId: id, userId: user.id },
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

    return NextResponse.json(updatedSalaryStructure);
  } catch (error) {
    console.error('SALARY STRUCTURE PUT - Error:', error);
    return NextResponse.json({ error: 'Failed to update salary structure' }, { status: 500 });
  }
});

export const DELETE = withAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const deleted = await (prisma as any).salaryStructure.deleteMany({
      where: { id, userId: user.id },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Salary structure not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Salary structure deleted successfully' });
  } catch (error) {
    console.error('SALARY STRUCTURE DELETE - Error:', error);
    return NextResponse.json({ error: 'Failed to delete salary structure' }, { status: 500 });
  }
});

export const PATCH = withAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { id, action } = body;

    if (!id || action !== 'ACTIVATE') {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
    }

    const owned = await (prisma as any).salaryStructure.findFirst({
      where: { id, userId: user.id },
    });
    if (!owned) {
      return NextResponse.json({ error: 'Salary structure not found' }, { status: 404 });
    }

    await (prisma as any).salaryStructure.updateMany({
      where: { userId: user.id },
      data: { isActive: false },
    });

    const updatedStructure = await (prisma as any).salaryStructure.update({
      where: { id },
      data: { isActive: true },
    });

    return NextResponse.json(updatedStructure);
  } catch (error) {
    console.error('SALARY STRUCTURE PATCH - Error:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
});
