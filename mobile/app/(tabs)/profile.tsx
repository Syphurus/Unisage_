// ============================================
// UniSage Mobile — Profile Tab Screen
// ============================================

import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/lib/hooks/useAuth';
import { COLORS } from '@/lib/constants';
import { getInitials } from '@/lib/utils';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-5 pt-4 pb-8">
          <Text className="text-2xl font-bold text-gray-900 mb-6">Profile</Text>

          {/* Avatar & Info */}
          <View className="bg-white rounded-2xl p-6 items-center shadow-sm mb-6">
            {/* Initials Avatar */}
            <View
              style={{ backgroundColor: COLORS.brand[500] }}
              className="w-20 h-20 rounded-full items-center justify-center mb-4"
            >
              <Text className="text-white text-2xl font-bold">
                {getInitials(user?.name)}
              </Text>
            </View>

            <Text className="text-xl font-bold text-gray-900">
              {user?.name ?? 'Student'}
            </Text>
            <Text className="text-gray-500 mt-1">{user?.email ?? ''}</Text>

            {user?.enrollment_number && (
              <View className="mt-3 bg-brand-50 px-4 py-1.5 rounded-full">
                <Text style={{ color: COLORS.brand[600] }} className="text-sm font-medium">
                  {user.enrollment_number}
                </Text>
              </View>
            )}

            {user?.year && (
              <Text className="text-gray-500 mt-2 text-sm">
                Year {user.year}{user.semester ? ` · Semester ${user.semester}` : ''}
              </Text>
            )}
          </View>

          {/* Settings List */}
          <View className="bg-white rounded-2xl overflow-hidden shadow-sm mb-6">
            <ProfileRow
              icon="person-outline"
              label="Edit Profile"
              onPress={() => {
                // TODO: navigate to edit profile
              }}
            />
            <Separator />
            <ProfileRow
              icon="bookmark-outline"
              label="Bookmarks"
              onPress={() => {
                // TODO: navigate to bookmarks
              }}
            />
            <Separator />
            <ProfileRow
              icon="notifications-outline"
              label="Notifications"
              onPress={() => {}}
            />
            <Separator />
            <ProfileRow
              icon="help-circle-outline"
              label="Help & Support"
              onPress={() => {}}
            />
            <Separator />
            <ProfileRow
              icon="information-circle-outline"
              label="About UniSage"
              subtitle="v1.0.0"
              onPress={() => {}}
            />
          </View>

          {/* Logout */}
          <Pressable
            onPress={handleLogout}
            className="bg-white rounded-2xl p-4 flex-row items-center justify-center shadow-sm active:opacity-80"
          >
            <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
            <Text className="ml-2 text-base font-semibold" style={{ color: COLORS.error }}>
              Logout
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---- Profile Row ----
function ProfileRow({
  icon,
  label,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-4 py-3.5 active:bg-gray-50"
    >
      <Ionicons name={icon} size={22} color={COLORS.gray[600]} />
      <View className="flex-1 ml-3">
        <Text className="text-base text-gray-900">{label}</Text>
        {subtitle && <Text className="text-xs text-gray-400">{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.gray[400]} />
    </Pressable>
  );
}

function Separator() {
  return <View className="h-px bg-gray-100 mx-4" />;
}
