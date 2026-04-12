import auth from '@react-native-firebase/auth';

export const firebaseAuth = auth();

export const sendOTP = async (phoneNumber: string): Promise<string | null> => {
  try {
    const formattedNumber = phoneNumber.startsWith('+91') 
      ? phoneNumber 
      : `+91${phoneNumber}`;
    
    const confirmation = await firebaseAuth.signInWithPhoneNumber(formattedNumber);
    return confirmation.verificationId;
  } catch (error) {
    console.error('Error sending OTP:', error);
    return null;
  }
};

export const verifyOTP = async (
  verificationId: string, 
  otp: string
): Promise<{ success: boolean; idToken: string | null }> => {
  try {
    const credential = auth.PhoneAuthProvider.credential(verificationId, otp);
    const userCredential = await firebaseAuth.signInWithCredential(credential);
    const idToken = await userCredential.user.getIdToken();
    return { success: true, idToken };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return { success: false, idToken: null };
  }
};

export const signOut = async (): Promise<void> => {
  try {
    await firebaseAuth.signOut();
  } catch (error) {
    console.error('Error signing out:', error);
  }
};
