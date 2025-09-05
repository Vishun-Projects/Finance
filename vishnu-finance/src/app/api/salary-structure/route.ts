import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export async function GET(request: NextRequest) {
  console.log('🔍 SALARY STRUCTURE GET - Starting request');
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    console.log('🔍 SALARY STRUCTURE GET - User ID:', userId);

    if (!userId) {
      console.log('❌ SALARY STRUCTURE GET - No user ID provided');
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('🔍 SALARY STRUCTURE GET - Fetching from database for user:', userId);
    // Fetch salary structures from database using type assertion
    const salaryStructures = await (prisma as any).salaryStructure.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    console.log('✅ SALARY STRUCTURE GET - Found salary structures:', salaryStructures.length, 'records');
    console.log('📊 SALARY STRUCTURE GET - Salary structures data:', JSON.stringify(salaryStructures, null, 2));
    return NextResponse.json(salaryStructures);
  } catch (error) {
    console.error('❌ SALARY STRUCTURE GET - Error:', error);
    console.error('❌ SALARY STRUCTURE GET - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to fetch salary structures' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('➕ SALARY STRUCTURE POST - Starting request');
  try {
    const body = await request.json();
    console.log('➕ SALARY STRUCTURE POST - Request body:', JSON.stringify(body, null, 2));
    
    const {
      jobTitle,
      company,
      baseSalary,
      allowances,
      deductions,
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

    console.log('➕ SALARY STRUCTURE POST - Extracted data:', {
      jobTitle,
      company,
      baseSalary,
      allowances,
      deductions,
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
    });

    // Validate required fields
    if (!jobTitle || !company || !baseSalary || !effectiveDate || !userId) {
      console.log('❌ SALARY STRUCTURE POST - Missing required fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('➕ SALARY STRUCTURE POST - Creating salary structure in database...');
    // Create new salary structure in database using type assertion
    const newSalaryStructure = await (prisma as any).salaryStructure.create({
      data: {
        jobTitle,
        company,
        baseSalary: parseFloat(baseSalary),
        allowances: allowances ? JSON.stringify(allowances) : null,
        deductions: deductions ? JSON.stringify(deductions) : null,
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

    console.log('✅ SALARY STRUCTURE POST - Successfully created salary structure:', JSON.stringify(newSalaryStructure, null, 2));

    // Create salary history entry if change type and reason provided
    if (changeType && changeReason) {
      console.log('➕ SALARY STRUCTURE POST - Creating salary history entry...');
      await (prisma as any).salaryHistory.create({
        data: {
          salaryStructureId: newSalaryStructure.id,
          jobTitle: newSalaryStructure.jobTitle,
          company: newSalaryStructure.company,
          baseSalary: newSalaryStructure.baseSalary,
          allowances: newSalaryStructure.allowances,
          deductions: newSalaryStructure.deductions,
          effectiveDate: newSalaryStructure.effectiveDate,
          endDate: newSalaryStructure.endDate,
          currency: newSalaryStructure.currency,
          location: newSalaryStructure.location,
          department: newSalaryStructure.department,
          grade: newSalaryStructure.grade,
          changeType: changeType,
          changeReason: changeReason,
          userId: userId
        }
      });
      console.log('✅ SALARY STRUCTURE POST - Successfully created salary history entry');
    }

    return NextResponse.json(newSalaryStructure);
  } catch (error) {
    console.error('❌ SALARY STRUCTURE POST - Error:', error);
    console.error('❌ SALARY STRUCTURE POST - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to create salary structure' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  console.log('✏️ SALARY STRUCTURE PUT - Starting request');
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    console.log('✏️ SALARY STRUCTURE PUT - Update data:', JSON.stringify({ id, ...updateData }, null, 2));

    if (!id) {
      console.log('❌ SALARY STRUCTURE PUT - No ID provided');
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    console.log('✏️ SALARY STRUCTURE PUT - Updating salary structure in database...');
    // Update salary structure in database using type assertion
    const updatedSalaryStructure = await (prisma as any).salaryStructure.update({
      where: { id },
      data: {
        ...updateData,
        baseSalary: updateData.baseSalary ? parseFloat(updateData.baseSalary) : undefined,
        allowances: updateData.allowances ? JSON.stringify(updateData.allowances) : undefined,
        deductions: updateData.deductions ? JSON.stringify(updateData.deductions) : undefined,
        effectiveDate: updateData.effectiveDate ? new Date(updateData.effectiveDate) : undefined,
        endDate: updateData.endDate ? new Date(updateData.endDate) : undefined,
        updatedAt: new Date()
      }
    });

    console.log('✅ SALARY STRUCTURE PUT - Successfully updated salary structure:', JSON.stringify(updatedSalaryStructure, null, 2));
    return NextResponse.json(updatedSalaryStructure);
  } catch (error) {
    console.error('❌ SALARY STRUCTURE PUT - Error:', error);
    console.error('❌ SALARY STRUCTURE PUT - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to update salary structure' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  console.log('🗑️ SALARY STRUCTURE DELETE - Starting request');
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    console.log('🗑️ SALARY STRUCTURE DELETE - ID to delete:', id);

    if (!id) {
      console.log('❌ SALARY STRUCTURE DELETE - No ID provided');
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    console.log('🗑️ SALARY STRUCTURE DELETE - Deleting from database...');
    // Delete from database using type assertion
    await (prisma as any).salaryStructure.delete({
      where: { id }
    });

    console.log('✅ SALARY STRUCTURE DELETE - Successfully deleted salary structure');
    return NextResponse.json({ message: 'Salary structure deleted successfully' });
  } catch (error) {
    console.error('❌ SALARY STRUCTURE DELETE - Error:', error);
    console.error('❌ SALARY STRUCTURE DELETE - Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to delete salary structure' }, { status: 500 });
  }
}
