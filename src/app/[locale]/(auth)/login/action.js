'use server'
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createToken, setAuthCookie } from '@/lib/serverAuth';
import jwt from 'jsonwebtoken';
import { exec } from 'child_process';

async function getSystemId() {
  const command = `powershell -Command "Get-WmiObject -Class Win32_ComputerSystemProduct | Select-Object -ExpandProperty UUID"`;

  exec(command, (error, stdout, stderr) => {
      if (error) {
          console.error('Error fetching UUID:', error);
          return;
      }
      // Parse the output to extract the UUID
      const uuid = stdout.trim(); // Trim spaces
      console.log('UUID:', uuid);
  });
}

async function verifyAndUpdateLicense(user, licenseToken) {
  try {
    if (!licenseToken) return false;

    const license = jwt.decode(licenseToken);
    const currentSystemId = await getSystemId();
    // const currentSystemId = '1234567890';
    console.log("License System Key:", license?.system_key);
    console.log("Current System ID:", currentSystemId);


    // Check if license has all required fields in correct format
    const isValidFormat = license &&
      typeof license === 'object' &&
      typeof license.id === 'string' &&
      typeof license.key === 'string' &&
      license.key.startsWith('LIC-') &&
      typeof license.client_name === 'string' &&
      typeof license.issued_at === 'string' &&
      typeof license.expires_at === 'string' &&
      typeof license.expires_at === 'string' &&
      typeof license.status === 'string' &&
      typeof license.system_key === 'string';

    if (!isValidFormat) {
      return {
        isValid: false,
        error: 'Invalid license format. Please enter a valid license key.'
      };
    }

    // Normalize both system keys by trimming and converting to lowercase
    const normalizedLicenseKey = license.system_key.trim().toLowerCase();
    const normalizedSystemId = currentSystemId.trim().toLowerCase();
    console.log("Normalized License Key:", normalizedLicenseKey);
    console.log("Normalized System ID:", normalizedSystemId);

    // Check if the license's system key matches current system
    if (normalizedLicenseKey !== normalizedSystemId) {
      return {
        isValid: false,
        error: 'Invalid license key.',
        currentSystem: currentSystemId,
        licenseSystem: license.system_key
      };
    }

    // Check if license key or system key is already in use by any user
    const existingLicenses = await prisma.user.findMany({
      where: {
        OR: [
          { licenseKey: license.key },
          { licenseSystemKey: normalizedSystemId }
        ],
        NOT: {
          id: user.id
        }
      }
    });

    // // If any user has this license key
    // const userWithLicense = existingLicenses.find(u => u.licenseKey === license.key);
    // if (userWithLicense) {
    //   return {
    //     isValid: false,
    //     error: 'User already has this license key.'
    //   };
    // }

    // If any user has this system key
    // const userWithSystemKey = existingLicenses.find(u => u.licenseSystemKey === normalizedSystemId);
    // if (userWithSystemKey) {
    //   return {
    //     isValid: false,
    //     error: 'Invalid license key.'
    //   };
    // }

    // If the user already has a license, check if they're trying to use a different system key
    if (user.licenseKey && user.licenseSystemKey &&
      (user.licenseKey === license.key && user.licenseSystemKey !== license.system_key)) {
      return {
        isValid: false,
        error: 'Invalid license key.'
      };
    }

    const now = new Date();
    const expiresAt = new Date(license.expires_at);

    // Check if license is expired
    if (now > expiresAt) {
      // If this is the same expired license the user had before, prevent reuse
      if (user.licenseKey === license.key && user.licenseExpiresAt) {
        const previousExpiryDate = new Date(user.licenseExpiresAt);
        if (previousExpiryDate.getTime() === expiresAt.getTime()) {
          return {
            isValid: false,
            error: 'This license has expired and cannot be reused. Please provide a new valid license.'
          };
        }
      }

      // Clear expired license data
      await prisma.user.update({
        where: { id: user.id },
        data: {
          licenseKey: null,
          licenseExpiresAt: null,
          licenseClientName: null,
          licenseDomain: null,
          licenseSystemKey: null
        }
      });

      return {
        isValid: false,
        error: 'License has expired. Please provide a valid license.'
      };
    }

    // Update user with license information
    await prisma.user.update({
      where: { id: user.id },
      data: {
        licenseKey: license.key,
        licenseExpiresAt: new Date(license.expires_at),
        licenseClientName: license.client_name,
        licenseDomain: license.domain,
        licenseSystemKey: license.system_key
      }
    });

    return { isValid: true };
  } catch (error) {
    console.error('License verification error:', error);
    return {
      isValid: false,
      error: 'Invalid license format. Please provide a valid license key.'
    };
  }
}

export async function loginUser(formData) {
  try {
    const email = formData.get('email');
    const password = formData.get('password');
    const license = formData.get('license');
    const isEmployee = formData.get('isEmployee') === 'true';

    // Check required fields based on login type
    if (!email || !password) {
      return {
        success: false,
        error: 'Email and password are required'
      };
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        fullName: true,
        email: true,
        password: true,
        role: true,
        status: true,
        managedBranch: {
          select: {
            id: true
          }
        },
        branch: {
          select: {
            id: true
          }
        },
        assignedDesk: {
          select: {
            id: true
          }
        },
        licenseKey: true,
        licenseExpiresAt: true,
        licenseSystemKey: true,
        licenseClientName: true,
        licenseDomain: true
      }
    });


    if (!user) {
      return { success: false, error: 'Invalid credentials' };
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Only check for license if not an employee login AND user is not an employee
    if (!isEmployee && user.role !== 'EMPLOYEE' && !license) {
      return {
        success: false,
        error: 'License key is required'
      };
    }

    // Only perform license verification for non-employee users
    if (!isEmployee && user.role !== 'EMPLOYEE') {

      // Decode the provided license token
      const decodedLicense = jwt.decode(license);

      console.log("decoded ", decodedLicense)
      if (!decodedLicense) {
        return {
          success: false,
          error: 'Invalid license format'
        };
      }

      // Get current system ID
      const currentSystemId = await getSystemId();
      // const currentSystemId = '1234567890';

      // console.log("=== License Verification Debug ===");
      // console.log("Current System ID:", currentSystemId);
      // console.log("License System Key:", decodedLicense.system_key);
      // console.log("Stored System Key:", user.licenseSystemKey);

      // If user has existing license details, verify they match
      // if (user.licenseKey) {
      //   console.log("userrr", user.licenseKey)
      //   // Check if the provided license matches stored details
      //   const isMatchingLicense = 
      //     user.licenseKey === decodedLicense.key &&
      //     user.licenseSystemKey === currentSystemId &&
      //     user.licenseClientName === decodedLicense.client_name

      //     console.log("hell", isMatchingLicense)
      //   if (!isMatchingLicense) {
      //     // console.log("License Mismatch Details:");
      //     // console.log("Stored License Key:", user.licenseKey);
      //     // console.log("Provided License Key:", decodedLicense.key);
      //     // console.log("Stored System Key:", user.licenseSystemKey);
      //     // console.log("Current System ID:", currentSystemId);
      //     return {
      //       success: false,
      //       error: 'Invalid license key.'
      //     };
      //   }

      //   // Check if license is expired
      //   const now = new Date();
      //   const expiresAt = new Date(user.licenseExpiresAt);

      //   if (now > expiresAt) {
      //     // Clear expired license data
      //     await prisma.user.update({
      //       where: { id: user.id },
      //       data: {
      //         licenseKey: null,
      //         licenseExpiresAt: null,
      //         licenseClientName: null,
      //         licenseDomain: null,
      //         licenseSystemKey: null
      //       }
      //     });

      //     return {
      //       success: false,
      //       error: 'Your license has expired. Please provide a new valid license.'
      //     };
      //   }
      // } else {
      //   // If user doesn't have a license, verify and update with new license
      //   const licenseVerification = await verifyAndUpdateLicense(user, license);
      //   // console.log("License Verification Result:", licenseVerification);
      //   if (!licenseVerification.isValid) {
      //     return { 
      //       success: false, 
      //       error: licenseVerification.error
      //     };
      //   }
      // }

      const licenseVerification = await verifyAndUpdateLicense(user, license);
      if (!licenseVerification.isValid) {
        return {
          success: false,
          error: licenseVerification.error
        };
      }

    }

    // Set branchId based on role
    const branchId = user.role === 'MANAGER'
      ? user.managedBranch?.id
      : user.branch?.id;

    const tokenPayload = {
      id: user.id,
      email: user.email,
      name: user.fullName,
      role: user.role,
      branchId: branchId || null,
      assignedDeskId: user.assignedDesk?.id || null
    };

    const token = createToken(tokenPayload);
    if (!token) {
      throw new Error('Failed to create authentication token');
    }

    await setAuthCookie(token);

    return {
      success: true,
      data: {
        id: user.id,
        role: user.role,
        name: user.fullName,
        email: user.email,
        branchId: branchId || null,
        assignedDeskId: user.assignedDesk?.id || null
      }
    };

  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}